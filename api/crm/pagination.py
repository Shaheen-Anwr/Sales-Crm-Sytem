from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """?page=2&page_size=100: 50 records per page by default, at most 1000."""

    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000
