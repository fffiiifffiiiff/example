namespace Loading.Mvc.Controllers.Journals
{
    public class VehicleController : EntityCompanyCatalogueController<VehicleRepository, Vehicle, VehicleModel>
    {
        private SubEntityRepository<VehicleTrailer, Vehicle> TrailerRep { get; }
        private SubEntityRepository<FlatWagonTwistLock, FlatWagon> FlatWagonRep { get; }
        private SubEntityRepository<FlatbedTruckTwistLock, FlatbedTruck> FlatbedTruckRep { get; }
        private SubEntityRepository<FlatSemiTrailerTwistLock, FlatSemiTrailer> FlatSemiTrailerRep { get; }
        private SubEntityRepository<FlatTrailerTwistLock, FlatTrailer> FlatTrailerRep { get; }

        public VehicleController(KendoCatalogueControllerParameters<VehicleRepository, Vehicle, VehicleModel> parameters,
            SubEntityRepository<VehicleTrailer, Vehicle> trailerRep,
            SubEntityRepository<FlatWagonTwistLock, FlatWagon> flatWagonRep,
            SubEntityRepository<FlatbedTruckTwistLock, FlatbedTruck> flatbedTruckRep,
            SubEntityRepository<FlatSemiTrailerTwistLock, FlatSemiTrailer> flatSemiTrailerRep,
            SubEntityRepository<FlatTrailerTwistLock, FlatTrailer> flatTrailerRep) : base(parameters)
        {
            TrailerRep = trailerRep;
            FlatWagonRep = flatWagonRep;
            FlatbedTruckRep = flatbedTruckRep;
            FlatSemiTrailerRep = flatSemiTrailerRep;
            FlatTrailerRep = flatTrailerRep;
        }

        public override ActionResult PostCreate([ModelBinder(typeof(VehicleTrailerBinder))] VehicleModel viewModel)
        {
            return DataAccess.Work().Get(() =>
            {
                if (ModelState.IsValid)
                {
                    var trailers = viewModel.Trailers;
                    var model = ViewModelToModel(viewModel);
                    Repository.Save(model);
                    viewModel = ModelToViewModel(model);

                    TrailerRep.SetParent(viewModel.Id);
                    foreach (var item in trailers)
                    {
                        var trailer = TrailerRep.Create();
                        Mapper.Map(item, trailer);
                        TrailerRep.Save(trailer);
                        Mapper.Map(trailer, item);
                        viewModel.Trailers.Add(item);
                    }
                }
                return View(CreateName, viewModel);
            });
        }

        public override ActionResult Edit(object id)
        {
            return DataAccess.Work().Get(() =>
            {
                id = CastId(id);
                var model = Repository.Get(id);
                if (model == null) return (ActionResult)HttpNotFound();
                var viewModel = ModelToViewModel(model);

                int vehicleId = viewModel.IdFlatWagon ?? viewModel.IdFlatbedTruck ?? viewModel.IdFlatSemiTrailer ?? 0;
                if(vehicleId != 0)
                    viewModel.IsoContainer1Mask = GetIsoMask(viewModel.VehicleType, vehicleId);

                // Загружаем прицепы
                TrailerRep.SetParent(model);
                viewModel.Trailers = TrailerRep.Query.AsEnumerable().Select(Mapper.Map<VehicleTrailerModel>).ToList();

                return View(EditName, viewModel);
            });
        }

        [HttpPost]
        [ActionName("Edit")]
        public override ActionResult PostEdit([ModelBinder(typeof(VehicleTrailerBinder))] VehicleModel viewModel)
        {
            return DataAccess.Work().Get(() =>
            {
                TypeDescriptor
                    .GetProperties(viewModel)
                    .Cast<PropertyDescriptor>()
                    .Where(p => p.HasAttribute<VehicleTypeAttribute>())
                    .Select(p => new { Property = p, Attribute = p.Attributes<VehicleTypeAttribute>().First() })
                    .Where(x => (x.Attribute.VehicleType & (VehicleType)viewModel.VehicleType) == 0)
                    .ToList()
                    .ForEach(x =>
                    {
                        x.Property.SetValue(viewModel, null);
                    });

                if (ModelState.IsValid)
                {
                    IList<VehicleTrailerModel> trailers = new List<VehicleTrailerModel>();

                    var model = ViewModelToModel(viewModel);

                    TrailerRep.SetParent(model);

                    TrailerRep.DeleteAll();

                    foreach (var item in viewModel.Trailers)
                    {
                        var trailer = TrailerRep.Create();
                        Mapper.Map(item, trailer);
                        TrailerRep.Save(trailer);
                        Mapper.Map(trailer, item);
                        trailers.Add(item);
                    }

                    Repository.Update(model);
                    viewModel = ModelToViewModel(model);

                    viewModel.Trailers = trailers;
                }
                
                return View(EditName, viewModel);
            });
        }

        [HttpPost]
        public PartialViewResult VehicleTrailer(int count, bool isCovered)
        {
            return PartialView("View/_VehicleTrailer", new VehicleTrailerModel
            {
                Number = count,
                IsCovered = isCovered
            });
        }

        [HttpPost]
        public ActionResult CheckVehicleContainerType(int vehicleType, int id)
        {
            int mask = GetIsoMask(vehicleType, id);
            return Json(new { success = true, Mask = mask });
        }

        [HttpPost]
        public ActionResult CheckVehicleTrailerContainerType(int id)
        {
            // Маска допустимых контейнеров для размещения
            AllowedSetContainer mask = 0;
            mask = TransportAvailableContainerMask(FlatTrailerRep, id);

            return Json(new { success = true, Mask = (int)mask });
        }

        private AllowedSetContainer TransportAvailableContainerMask<T1, T2>(SubEntityRepository<T1, T2> repository, int id)
            where T1 : TwistLock, ISubEntity<T2>
            where T2 : EntityCompany
        {
            return DataAccess.Work().Get(() =>
            {
                repository.SetParent(id);
                AllowedSetContainer mask = 0;
                foreach (var i in repository.Query)
                    mask |= i.ContainerSet;
                return mask;
            });
        }

        private int GetIsoMask(int vehicleType, int id)
        {
            // Маска допустимых контейнеров для размещения
            AllowedSetContainer mask = 0;
            VehicleType type = (VehicleType)vehicleType;
            switch (type)
            {
                //Платформа + Контейнеры
                case VehicleType.FlatWagonAndIsoContainer:
                    mask = TransportAvailableContainerMask(FlatWagonRep, id);
                    break;
                //Автомобиль с платформой + Контейнеры
                case VehicleType.FlatbedTruckAndIsoContainer:
                    mask = TransportAvailableContainerMask(FlatbedTruckRep, id);
                    break;
                //Тягач + Открытый полуприцеп + Контейнеры
                case VehicleType.SemiTruckAndFlatSemiTrailerAndIsoContainer:
                    mask = TransportAvailableContainerMask(FlatSemiTrailerRep, id);
                    break;
            }

            return (int)mask;
        }
    }
}