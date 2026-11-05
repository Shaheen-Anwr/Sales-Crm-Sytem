"""Chart data for the CRM dashboard, computed with MongoDB aggregation pipelines.

Every chart is built from the sales pipeline: the deals are filtered by the query
parameters, put into groups (all together, per period, or per agent, product,
sector, ...) and every group gets the same metrics, so a chart can plot any of them.
"""

from datetime import datetime, timedelta

from rest_framework import serializers

from .mongo import get_db
from .serializers import DEAL_STAGES

# Deal fields that charts can filter and group by.
DEAL_FIELDS = ('deal_stage', 'sales_agent', 'product', 'account')

# Fields of the records a deal points at, which charts can filter and group by too:
# {field: (collection it is in, deal field holding that record's key)}.
RELATED_FIELDS = {
    'manager': ('sales_teams', 'sales_agent'),
    'regional_office': ('sales_teams', 'sales_agent'),
    'series': ('products', 'product'),
    'sector': ('accounts', 'account'),
    'office_location': ('accounts', 'account'),
}

INTERVALS = ('week', 'month', 'quarter')


# What the chart endpoints return

class DealMetricsSerializer(serializers.Serializer):
    """The numbers every chart endpoint returns for a group of deals."""

    deals = serializers.IntegerField(help_text='Number of deals')
    prospecting = serializers.IntegerField(help_text='Deals in the Prospecting stage')
    engaging = serializers.IntegerField(help_text='Deals in the Engaging stage')
    won = serializers.IntegerField(help_text='Deals won')
    lost = serializers.IntegerField(help_text='Deals lost')
    revenue = serializers.IntegerField(help_text='Sum of close_value of the won deals')
    pipeline_value = serializers.IntegerField(
        help_text="Value of the open (Prospecting and Engaging) deals at their product's sales_price"
    )
    win_rate = serializers.FloatField(
        allow_null=True, help_text='won / (won + lost), from 0 to 1; null if no deal has closed'
    )
    avg_deal_size = serializers.FloatField(allow_null=True, help_text='Average close_value of the won deals')
    avg_days_to_close = serializers.FloatField(
        allow_null=True, help_text='Average number of days from engage_date to close_date of the won deals'
    )


class TimelinePointSerializer(DealMetricsSerializer):
    period = serializers.DateField(help_text='First day of the period')
    label = serializers.CharField(help_text='The period, e.g. 2017-03, 2017-Q2 or 2017-W09')


class BreakdownRowSerializer(DealMetricsSerializer):
    group = serializers.CharField(
        allow_null=True, help_text='The value grouped by, e.g. the agent name; null for deals without one'
    )


class FilterOptionsSerializer(serializers.Serializer):
    """The values each chart filter accepts."""

    deal_stage = serializers.ListField(child=serializers.CharField())
    sales_agent = serializers.ListField(child=serializers.CharField())
    product = serializers.ListField(child=serializers.CharField())
    account = serializers.ListField(child=serializers.CharField())
    manager = serializers.ListField(child=serializers.CharField())
    regional_office = serializers.ListField(child=serializers.CharField())
    series = serializers.ListField(child=serializers.CharField())
    sector = serializers.ListField(child=serializers.CharField())
    office_location = serializers.ListField(child=serializers.CharField())


ORDERING_CHOICES = tuple(
    f'{sign}{name}' for name in ('group', *DealMetricsSerializer().fields) for sign in ('', '-')
)


# The query parameters they accept

def names(help_text):
    """A text parameter that can be repeated, e.g. ?sales_agent=Anna Snelling&sales_agent=Zane Levy."""
    return serializers.ListField(child=serializers.CharField(allow_blank=True), required=False, help_text=help_text)


class DealFiltersSerializer(serializers.Serializer):
    """Which deals a chart counts. Repeat a parameter to allow several values."""

    deal_stage = serializers.ListField(
        child=serializers.ChoiceField(choices=DEAL_STAGES), required=False, help_text='Only deals at these stages'
    )
    sales_agent = names('Only deals of these sales agents')
    product = names('Only deals for these products')
    account = names('Only deals with these accounts')
    manager = names('Only deals of the agents of these managers')
    regional_office = names('Only deals of the agents in these regional offices')
    series = names('Only deals for products of these series')
    sector = names('Only deals with accounts in these sectors')
    office_location = names('Only deals with accounts headquartered in these countries')
    engage_date__gte = serializers.DateField(required=False, help_text='Only deals engaged on or after this date')
    engage_date__lte = serializers.DateField(required=False, help_text='Only deals engaged on or before this date')
    close_date__gte = serializers.DateField(required=False, help_text='Only deals closed on or after this date')
    close_date__lte = serializers.DateField(required=False, help_text='Only deals closed on or before this date')


class TimelineParamsSerializer(DealFiltersSerializer):
    interval = serializers.ChoiceField(choices=INTERVALS, default='month', help_text='Length of each period')
    date_field = serializers.ChoiceField(
        choices=('close_date', 'engage_date'), default='close_date',
        help_text='The date that puts a deal in a period: when it closed, or when it was engaged',
    )


class BreakdownParamsSerializer(DealFiltersSerializer):
    by = serializers.ChoiceField(choices=(*DEAL_FIELDS, *RELATED_FIELDS), help_text='Field to group the deals by')
    ordering = serializers.ChoiceField(
        choices=ORDERING_CHOICES, required=False,
        help_text='Sort by group or by a metric; prefix with - for descending. '
                  'Default: -revenue, or the pipeline order for by=deal_stage',
    )
    limit = serializers.IntegerField(min_value=1, max_value=1000, required=False, help_text='Only the first N rows')


# The aggregations

def stage_is(*stages):
    return {'$in': ['$deal_stage', list(stages)]}


def sum_if(condition, value=1):
    return {'$sum': {'$cond': [condition, value, 0]}}


# Summed over the deals of every group; finish() turns them into the metrics returned.
TOTALS = {
    'deals': {'$sum': 1},
    'prospecting': sum_if(stage_is('Prospecting')),
    'engaging': sum_if(stage_is('Engaging')),
    'won': sum_if(stage_is('Won')),
    'lost': sum_if(stage_is('Lost')),
    'revenue': sum_if(stage_is('Won'), '$close_value'),
    'days_to_close': sum_if(
        stage_is('Won'), {'$dateDiff': {'startDate': '$engage_date', 'endDate': '$close_date', 'unit': 'day'}}
    ),
}
NO_DEALS = dict.fromkeys([*TOTALS, 'pipeline_value'], 0)


def summary(filters):
    """The metrics of all the deals `filters` selects, e.g. for KPI cards."""
    return finish(next(grouped_totals(filters, None), NO_DEALS))


def timeline(filters, interval='month', date_field='close_date'):
    """The metrics per week, month or quarter of `date_field`, with no gaps between periods."""
    truncate = {'date': f'${date_field}', 'unit': interval}
    if interval == 'week':
        truncate['startOfWeek'] = 'monday'
    groups = grouped_totals(filters, {'$dateTrunc': truncate}, conditions=[{date_field: {'$ne': None}}])
    totals = {group['_id']: group for group in groups}
    points = []
    if totals:
        start, last = min(totals), max(totals)
        while start <= last:
            points.append({
                'period': start.date().isoformat(),
                'label': period_label(start, interval),
                **finish(totals.get(start, NO_DEALS)),
            })
            start = next_period(start, interval)
    return points


def breakdown(filters, by, ordering=None, limit=None):
    """The metrics per value of `by`: per sales agent, product, sector, ..."""
    if by in RELATED_FIELDS:
        _, key = RELATED_FIELDS[by]
        groups = grouped_totals(filters, f'${key}', related_field=by)
    else:
        groups = grouped_totals(filters, f'${by}')
    rows = [{'group': group['_id'], **finish(group)} for group in groups]

    ordering = ordering or ('group' if by == 'deal_stage' else '-revenue')
    field, descending = ordering.lstrip('-'), ordering.startswith('-')

    def sort_value(row):
        if field != 'group':
            return row[field]
        return DEAL_STAGES.index(row['group']) if by == 'deal_stage' else row['group'].casefold()

    rows.sort(key=lambda row: str(row['group']).casefold())  # so that ties come out in a fixed order
    rows = (
        sorted((row for row in rows if row[field] is not None), key=sort_value, reverse=descending)
        + [row for row in rows if row[field] is None]
    )
    return rows[:limit] if limit else rows


def filter_options():
    """The values each chart filter can take, e.g. to fill dashboard dropdowns."""
    sources = {
        'sales_agent': 'sales_teams',
        'product': 'products',
        'account': 'accounts',
        **{field: collection for field, (collection, _) in RELATED_FIELDS.items()},
    }
    db = get_db()
    return {
        'deal_stage': list(DEAL_STAGES),
        **{field: sorted(db[collection].distinct(field), key=str.casefold) for field, collection in sources.items()},
    }


def match(filters, *conditions):
    """A $match stage selecting the deals that `filters` (validated query parameters) ask for."""
    conditions = list(conditions)
    for field in DEAL_FIELDS:
        values = [value for value in filters.get(field, ()) if value]
        if values:
            conditions.append({field: {'$in': values}})
    for field, (collection, key) in RELATED_FIELDS.items():
        values = [value for value in filters.get(field, ()) if value]
        if values:
            # e.g. regional_office=West becomes "sales_agent is one of the agents in West"
            keys = get_db()[collection].distinct(key, {field: {'$in': values}})
            conditions.append({key: {'$in': keys}})
    for field in ('engage_date', 'close_date'):
        for bound in ('gte', 'lte'):
            day = filters.get(f'{field}__{bound}')
            if day:
                conditions.append({field: {f'${bound}': datetime(day.year, day.month, day.day)}})
    return {'$match': {'$and': conditions} if conditions else {}}


def grouped_totals(filters, group, related_field=None, conditions=()):
    """TOTALS and pipeline_value per value of the `group` expression, over the deals `filters` selects.

    The deals are summed per group and product first, so product prices and
    related fields are looked up once per group instead of once per deal.
    """
    pipeline = [
        match(filters, *conditions),
        {'$group': {'_id': {'group': group, 'product': '$product'}, **TOTALS}},
        # Value the open deals at their product's list price.
        {'$lookup': {'from': 'products', 'localField': '_id.product', 'foreignField': 'product', 'as': 'product'}},
        {'$set': {'pipeline_value': {'$multiply': [
            {'$add': ['$prospecting', '$engaging']},
            {'$ifNull': [{'$first': '$product.sales_price'}, 0]},
        ]}}},
    ]
    if related_field:
        # Swap the group's key (e.g. an account name) for the related field (e.g. its sector).
        collection, key = RELATED_FIELDS[related_field]
        pipeline += [
            {'$lookup': {'from': collection, 'localField': '_id.group', 'foreignField': key, 'as': 'related'}},
            {'$set': {'_id.group': {'$first': f'$related.{related_field}'}}},
        ]
    pipeline.append({'$group': {'_id': '$_id.group', **{name: {'$sum': f'${name}'} for name in NO_DEALS}}})
    return get_db().sales_pipeline.aggregate(pipeline)


def finish(totals):
    """One group's metrics: its counts and sums, plus the rates and averages derived from them."""
    won, lost = totals['won'], totals['lost']
    return {
        'deals': totals['deals'],
        'prospecting': totals['prospecting'],
        'engaging': totals['engaging'],
        'won': won,
        'lost': lost,
        'revenue': totals['revenue'],
        'pipeline_value': totals['pipeline_value'],
        'win_rate': round(won / (won + lost), 4) if won + lost else None,
        'avg_deal_size': round(totals['revenue'] / won, 2) if won else None,
        'avg_days_to_close': round(totals['days_to_close'] / won, 1) if won else None,
    }


def period_label(start, interval):
    if interval == 'quarter':
        return f'{start.year}-Q{(start.month - 1) // 3 + 1}'
    if interval == 'month':
        return f'{start:%Y-%m}'
    year, week, _ = start.isocalendar()
    return f'{year}-W{week:02d}'


def next_period(start, interval):
    if interval == 'week':
        return start + timedelta(weeks=1)
    month = start.month - 1 + (3 if interval == 'quarter' else 1)
    return start.replace(year=start.year + month // 12, month=month % 12 + 1)
