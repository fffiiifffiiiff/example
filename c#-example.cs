namespace Loading.Mvc.Controllers.Base
{
    public abstract class CatalogueController<TRepository, T, TModel> : EntityCompanyCatalogueController<TRepository, T, TModel>
        where TRepository : CatalogueRepository<T>
        where T : EntityExCompany<T>, new()
        where TModel : EntityModel, new()
    {
        protected CatalogueController(KendoCatalogueControllerParameters<TRepository, T, TModel> parameters) : base(parameters)
        {
        }

        protected override IQueryable TransformQuery(IQueryable<T> query)
        {
            return query.Where(x => x.Duplicate != null && !x.IsDeleted).ToList().Select(t => ModelToViewModel(t)).AsQueryable();
        }

        protected override IQueryable TransformQueryComponentSingleRead(int id, IQueryable<T> query)
        {
            return query.Where(x => x.Duplicate != null && (x.Id == id || !x.IsDeleted)).OrderByDescending(x => x.IsDeleted).ToList().Select(t => ModelToViewModel(t)).AsQueryable();
        }

        [HttpPost]
        public override ActionResult GridCreate(DataSourceRequest dataSourceRequest, TModel viewModel) 
            => GridCreateOrUpdate(dataSourceRequest, viewModel);

        [HttpPost]
        public override ActionResult GridUpdate(DataSourceRequest dataSourceRequest, TModel viewModel)
            => GridCreateOrUpdate(dataSourceRequest, viewModel, false);

        private ActionResult GridCreateOrUpdate(DataSourceRequest dataSourceRequest, TModel viewModel, bool isNew = true)
        {
            return DataAccess.Work().Get(() =>
            {
                if (viewModel != null && ModelState.IsValid)
                {
                    // Создание дубликата
                    var modelDuplicate = RepositoryCreate();
                    Mapper.Map(viewModel, modelDuplicate);
                    AfterMapping(viewModel, modelDuplicate, isNew);
                    Repository.Save(modelDuplicate);

                    // Создание основного объекта
                    var model = ViewModelToModel(viewModel);
                    model.Duplicate = modelDuplicate;
                    AfterMapping(viewModel, model, isNew);
                    if (isNew) Repository.Save(model);
                    else Repository.Update(model);
                    
                    // Маппинг нового элемента в модель
                    viewModel = ModelToViewModel(model);
                }
                return Json(new[] { viewModel }.ToDataSourceResult(dataSourceRequest, ModelState));
            });
        }

        public override ActionResult GridDestroy(DataSourceRequest dataSourceRequest, TModel viewModel)
        {
            var id = viewModel.Id;
            return DataAccess.Work().Get(() =>
            {
                if (!Repository.IsLinked(id))
                    return base.GridDestroy(dataSourceRequest, viewModel);
                var model = Repository.Get(id);
                model.IsDeleted = true;
                Repository.Update(model);
                return Json(new[] { ModelToViewModel(model) }.ToDataSourceResult(dataSourceRequest, ModelState));
            });
        }

        protected virtual void AfterMapping(TModel viewModel, T model, bool isNew)
        {
            
        }
    }
}