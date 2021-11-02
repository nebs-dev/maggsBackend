$(function () {
    /* parsley */
    $('form').parsley();

    /* mappicker */
    var addresspickerMap = $(".map-addresspicker");

    if (addresspickerMap) {
        var lat = $("#lat");
        var long = $("#long");
        addresspickerMap.addresspicker(
            {
                regionBias: "ch",
                map: ".map-canvas",
                typeaheaddelay: 1000,
                mapOptions: {
                    zoom: 16,
                    center: new google.maps.LatLng(lat.val() || 47.3686498, long.val() || 8.539182500000038)
                }
            });


        function setPosition() {
            addresspickerMap.addresspicker("setPosition", {lat: lat.val(), lng: long.val()});
        }

        if (lat.val() || long.val()) {
            setPosition();
        }

        lat.on('blur', setPosition);
        long.on('blur', setPosition);

        addresspickerMap.on("addressChanged", function (evt, address) {
            lat.val(address.geometry.location.lat());
            long.val(address.geometry.location.lng());
        });


        addresspickerMap.on("positionChanged", function (evt, markerPosition) {
            markerPosition.getAddress(function (address) {
                if (address) { //address is a Google Geocoder result
                    $(".map-addresspicker").val(address.formatted_address);
                    lat.val(address.geometry.location.lat());
                    long.val(address.geometry.location.lng());
                }
            })
        });
    }

    // open links in same window if standalone app
    if (("standalone" in window.navigator) && window.navigator.standalone) {
        $("a").click(function (event) {
            event.preventDefault();
            window.location = $(this).attr("href");
        });
    }


    //$('.deleteBtn').on('click', function(e){
    //    e.preventDefault();
    //    return confirm('Are you really sure? All appointments, beacons, campaigns and related data for this store will be deleted');
    //});
});