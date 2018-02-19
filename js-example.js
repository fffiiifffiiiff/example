$(function () {
    vehicle.init();
});
window.vehicle = {
    init: function () {
        let that = this;
        
        // Подчиненная таблица
        that.vehicleTrailer = $("#vehicleTrailer");
        that.vehicleTrailerBlock = $(".vehicleTrailersBlock");
        that.vehicleTrailerMask = that.vehicleTrailer.attr("mask");

        // Все блоки с транспортом и грузом, начиная с контейнеров, заканчивая транспортными средствами
        that.AllEntities = $("div[blockvisible]");

        // Список всех ТС у которых есть контейнеры
        that.vehicleArray = ["IdFlatWagon", "IdFlatbedTruck", "IdFlatSemiTrailer"];

        // Получаем все select leech's и пробегаем по ним
        that.AllEntitiesSelectLeech = that.AllEntities.find("[data-bind*='slSelectLeechValueBinder']");
        $.each(that.AllEntitiesSelectLeech, function (e, item) {

            // Оборачиваем в jQuery
            item = $(item);

            // Получаем SelectLeech
            var selectLeech = item.data("slSelectLeech");

            // Если это транспортное средство с контейнерами
            if ($.inArray(item.attr("name"), that.vehicleArray) !== -1) {

                // Подписываемся на обработку события
                selectLeech.onDataItemChanged(function (e, dataItem, action) {

                    // Если мы изменили ТС
                    if (action === "change") {

                        // Если ТС не нулевой
                        if (dataItem != null) {

                            // Считываем новые маски для контейнеров
                            that.updateContainerMaskByVehicleType(dataItem.Id);
                        }

                        // Очищаем все контейнера
                        that.clearAllContainers();
                    }
                });
            }

            // Единожды подписываемся на событие
            selectLeech.oneDataItemChanged(function (e, dataItem, action) {
                if (action === "fetch") {

                    // Если элемент был удалён
                    if (dataItem.IsDeleted) {

                        // Находим input с текстом
                        var input = selectLeech.options.elements.textElement;

                        // Сохраняем старый цвет
                        var oldColor = input.css("color");

                        // Подсвечиваем красным
                        input.css({ "color": "red" });

                        // Подписываемся на событие ещё раз
                        selectLeech.oneDataItemChanged(function () {

                            // Восстанавливаем цвет на старый
                            input.css({ "color": oldColor });
                        });
                    }
                }
            });
        });

        // Все блоки с атрибутом vehicleTrailerVisible
        that.vehicleTrailerVisible = $("div[vehicleTrailerVisible]");

        // Первый контейнер
        that.iso1Mask = window.globalRes.vehicle.values.primaryIso1Mask;
        that.isoContainer1 = that.AllEntities.find('input[name="IdIsoContainer1"]').data("slSelectLeech");
        that.isoContainer1.postData(function () { return { mask: that.iso1Mask }; });

        // Второй контейнер
        that.iso2Mask = 0;
        that.isoContainer2 = that.AllEntities.find('input[name="IdIsoContainer2"]').data("slSelectLeech");
        that.isoContainer2_Wrapper = that.isoContainer2.options.elements.targetElement.closest(".form-group");
        that.isoContainer2.postData(function () { return { mask: that.iso2Mask }; });

        // Отступы
        that.gapsUrl = 0;
        that.gap1 = that.AllEntities.find('input[name="IdGap1"]');
        that.gap1.data("slSelectLeech").options.dataSource.selectContentUrl = that.gapsUrl;

        that.gap2 = that.AllEntities.find('input[name="IdGap2"]');
        that.gap2.data("slSelectLeech").postData(function () { return { groupMask: that.gapsUrl } });

        // Если доступен второй контейнер - показываем
        if ((that.iso1Mask & window.globalRes.vehicle.two20ft) > 0) {
            that.isoContainer2_Wrapper.fadeIn("normal");
            that.gap2.closest(".form-group").fadeIn("normal");
        }

        // Тип выбранного ТС
        that.vehicleType = $('input[name="VehicleType"]').data("kendoDropDownList");

        // Установка стандартного значения curVehicleType и iso1Mask
        var vehicleType = that.vehicleType.value();

        // Проверка на то, что выбран стандартный тип транспортного средства
        if (vehicleType.length > 0) {

            // Устанавливаем его
            that.curVehicleType = parseInt(that.vehicleType.value());

            // Если это контейнер, то необходимо сразу задать, что маска = всем 
            if (that.curVehicleType === window.globalRes.vehicle.isoContainer)
                that.iso1Mask = window.globalRes.vehicle.allContainers;
        }

        // Подписываемся на change у ТС
        that.vehicleType.bind("change", function (e) {

            // Прячем все элементы ТС и очищаем значения
            that.AllEntities.hide();
            that.clearAll();

            // Сохраняем выбранное значение
            that.curVehicleType = parseInt(this.value());

            // Скрывем прицепы
            that.vehicleTrailer.hide();
            that.vehicleTrailerBlock.css("top", "-50px");

            // Если выбраное ТС контейнер - ему доступны все типы контейнеров
            if (that.curVehicleType === window.globalRes.vehicle.isoContainer)
                that.iso1Mask = window.globalRes.vehicle.allContainers;

            // В зависимости от типа ТС выставляем маску для Gap
            if ((that.curVehicleType & window.globalRes.vehicle.vehicleTypeContainer) > 0)
                that.gapsUrl = window.globalRes.vehicle.containerGapUrl;
            if ((that.curVehicleType & window.globalRes.vehicle.vehicleTypeRailway) > 0)
                that.gapsUrl = window.globalRes.vehicle.railwayGapUrl;
            if ((that.curVehicleType & window.globalRes.vehicle.vehicleTypeRoad) > 0)
                that.gapsUrl = window.globalRes.vehicle.roadGapUrl;

            // Открываем ТС у которого необходимая маска
            $.each(that.AllEntities, function () {
                let entityWrapper = $(this);

                // Если этот элемент подходит под заданную маску транспортного средства
                if ((parseInt(entityWrapper.attr("blockVisible")) & that.curVehicleType) > 0) {

                    // Показываем его
                    entityWrapper.fadeIn("normal");

                    // Если доступны прицепы
                    if ((that.vehicleTrailerMask & that.curVehicleType) > 0) {

                        // Показываем их
                        that.vehicleTrailerBlock.css("top", 0);
                    }
                }
            });
        });

        // Обработка изменения первого контейнера
        that.isoContainer1.onDataItemChanged(function (e, dataItem, action) {
            let standart = null, isEnabled = false;

            // Если элемент выбран, то получаем маску
            if (dataItem != null) standart = dataItem.Standart;

            // Обработка маски второго контейнер
            that.iso2Mask = that.getIsoContainer2MaskByStandart(standart);

            // Если маска не null, то включаем второй контейнер
            if (that.iso2Mask != null) {
                isEnabled = true;
            }
            // Обработка доступности второго контейнера
            that.enableIso(isEnabled, that.isoContainer2.options.elements.dataItemElement);
        });

        // Показываем кнопки и блок прицепов если нужно
        if ((that.vehicleTrailerMask & that.curVehicleType) > 0) {
            that.vehicleTrailerBlock.css("top", 0);
            if (that.vehicleTrailer[0].childElementCount > 0)
                that.vehicleTrailer.show();
        }

        // Кнопка отмены
        $("#cancelButton").click(function (event) {
            event.preventDefault();
            window.location.replace(location.origin + "/Vehicle");
        });

        // Кнопка добавления закрытого прицепа
        $("#addCoveredTrailerButton").on("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            let that = this;
            that.vehicleTrailer.fadeIn("normal");
            let number = +that.vehicleTrailer.find(".fieldset-single.fieldset-popup").last().attr("forvehicletrailer") + 1;
            if (isNaN(number)) number = 0;
            let call = $.post(window.globalRes.vehicle.vehicleTrailerUrl, { Count: number, IsCovered: true});
            call.done(function (data) {
                that.vehicleTrailer.append(data);
            });
        });

        // Кнопка добавления открытого прицепа
        $("#addFlatTrailerButton").on("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            let that = this;
            that.vehicleTrailer.show().fadeIn("normal");
            let number = +that.vehicleTrailer.find(".fieldset-single.fieldset-popup").last().attr("forvehicletrailer") + 1;
            if (isNaN(number)) number = 0;
            let call = $.post(window.globalRes.vehicle.vehicleTrailerUrl, { Count: number, IsCovered: false });
            call.done(function(data) {
                that.vehicleTrailer.append(data);
            });
        });

        // Кнопки удаления
        $(document).on("click", ".deleteTrailerButton", (e) => {
            var that = this;
            $(e.currentTarget).closest(".panel-body").hide("slow",
                function () {
                    this.remove();
                    if (!that.vehicleTrailer.find(".fieldset-single.fieldset-popup").length)
                        that.vehicleTrailer.fadeOut("normal");
                });
        });
    },

    // Запрос в контроллер на проверку возможностей погрузки контейнеров и их типов
    updateContainerMaskByVehicleType: function (id) {
        let that = this;

        // Обнуляем маску перед запросом
        that.iso1Mask = 0;

        // Отправляем запрос на сервер для получения маски
        let call = $.post(window.globalRes.vehicle.containerTypeUrl, { VehicleType: that.curVehicleType, Id: id });
        call.done(function (data) {
            if (data.success) {
                // Установка маски для 1ого контейнера
                that.iso1Mask = data.Mask;

                // Открываем/скрываем isoContainer2 в зависимости от возможности размещения второго контейнера
                if ((that.iso1Mask & window.globalRes.vehicle.two20ft) > 0) {
                    that.isoContainer2_Wrapper.fadeIn("normal");
                    that.gap2.closest(".form-group").fadeIn("normal");
                }
                else {
                    that.isoContainer2_Wrapper.fadeOut("normal");
                    that.gap2.closest(".form-group").fadeOut("normal");
                }
            }
        });
    },

    // Очистка всех iso containers после изменения выбранного ТС
    clearAllContainers: function () {
        let that = this;

        that.iso1Mask = 0;
        that.isoContainer1.options.elements.valueElement.data("slClearLeech").options.connection.clearValue();

        that.iso2Mask = 0;
        that.isoContainer2.options.elements.valueElement.data("slClearLeech").options.connection.clearValue();
    },

    // Очистка всех auto complete
    clearAll: function () {
        let that = this;

        let items = that.AllEntities.find(".sl-hidden");
        for (let i = 0; i < items.length; i++) {
            items.eq(i).data("slClearLeech").options.connection.clearValue();
        }
        let vehicleTrailersFieldsets = that.vehicleTrailer.find(".fieldset-single.fieldset-popup");
        for (let i = 0; i < vehicleTrailersFieldsets.length; i++) {
            vehicleTrailersFieldsets.eq(i).closest(".panel-body").remove();
        }
    },

    // Включение/выключение контейнеров
    enableIso: function (isEnabled, isoContainer) {
        // Если второй контейнер
        if (isoContainer.eq(0).attr("name").slice(-1) === "2") {
            let gap = this.gap2;
            gap.data("slSelectLeech").options.readOnly = !isEnabled;
            gap.closest(".form-group").toggleClass("k-state-disabled", !isEnabled).prop("disabled", !isEnabled);
            if (!isEnabled) {
                gap.data("slSelectLeech").options.elements.valueElement.data("slClearLeech").options.connection.clearValue();
            }
        }
        isoContainer.data("slSelectLeech").options.readOnly = !isEnabled;
        isoContainer.closest(".form-group").toggleClass("k-state-disabled", !isEnabled).prop("disabled", !isEnabled);
        if (!isEnabled) {
            isoContainer.data("slSelectLeech").options.elements.valueElement.data("slClearLeech").options.connection.clearValue();
        }
    },

    // Функция получения mask для второго контейнера
    getIsoContainer2MaskByStandart: function (standart) {
        var that = this;
        // Если первый контейнер не выбран, то у второго нет маски
        if (standart) {
            // Если транспорт допускает два контейнера
            if ((that.iso1Mask & window.globalRes.vehicle.two20ft) > 0) {
                // Если первый контейнер 20ft, то можно добавить ещё 20ft
                if (standart === window.globalRes.container._20ft)
                    return window.globalRes.vehicle.one20ft;
            }
        }
        return null;
    }
}
