from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('accounts', views.AccountViewSet, basename='account')
router.register('products', views.ProductViewSet, basename='product')
router.register('sales-teams', views.SalesTeamViewSet, basename='sales-agent')
router.register('sales-pipeline', views.SalesPipelineViewSet, basename='opportunity')
router.register('data-dictionary', views.DataDictionaryViewSet, basename='data-dictionary')
router.register('analytics', views.AnalyticsViewSet, basename='analytics')

urlpatterns = router.urls
