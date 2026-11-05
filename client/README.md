# Sales CRM dashboard

A Next.js dashboard for the CRM data that the Django API in `../api` serves. The charts
show revenue, win rates, the pipeline, teams, products, accounts and every deal.

## Run it

To run everything in Docker with one command, see the `README.md` in the project folder.
To run the dashboard on its own for development, read on.

The dashboard reads all its data from the API, so start the API first:

```bash
cd ../api
source venv/bin/activate
python manage.py runserver          # http://127.0.0.1:8000
```

Then start the dashboard in another terminal:

```bash
npm install                         # once
npm run dev                         # http://localhost:3000
```

For a production build, run `npm run build`, then `npm start`.

If the API runs somewhere else, set `API_URL` (see `.env.example`), for example in
`.env.local`:

```bash
API_URL=http://127.0.0.1:8000
```

## Pages

| Page      | What it shows                                                                  |
| --------- | ------------------------------------------------------------------------------ |
| Overview  | KPIs with trends, revenue over time, the pipeline funnel, won vs lost, top agents, offices, products and sectors |
| Deals     | Every opportunity: stage tabs, search, filters, sortable columns and paging    |
| Team      | Offices over time, revenue by manager and a sortable table of all agents       |
| Products  | Product series over time, win rate by product and a product table              |
| Accounts  | Top accounts, revenue by country and a searchable table of all accounts        |

The filters live in the URL, so a filtered view can be bookmarked or shared. A period
compares itself with the period before it. Every chart can switch to a table view.
There are light and dark themes, and the layout works on phones.

## How it's built

- **Next.js 16** (App Router, Cache Components). Pages are Server Components that call
  the API from the server (`src/lib/api.ts`), so the browser never needs CORS or API
  access. Data isn't cached, so the dashboard always shows the current database.
- **Recharts** for the line, area and bar charts. The bar lists and the funnel are
  plain HTML.
- **shadcn/ui** (Radix) for the controls, and **Tailwind CSS v4** for styling. The chart
  colors are defined in `src/app/globals.css` and were checked for color-vision
  deficiencies in both themes.

```
src/
  app/                  one folder per page; error.tsx is shown when the API is down
  components/charts/    trend, multi-line, won/lost, sparkline, bar list, funnel
  components/filters/   filter bar, period picker, week / month / quarter toggle
  lib/                  API client, types, formatting, periods, chart data shaping
```
