$(function () {
    $(".cropper").each(function () {
        var $cropper = $(this);
        $cropper.data('loading', true);
        if (!$cropper.data('width') || !$cropper.data('height')) {
            return alert("You must set width/height data to img");
        }

        $cropper.cropper({
            autoCropArea: 1,
            aspectRatio: $cropper.data('width') / $cropper.data('height'),
            built: function (e) {
                if (!$cropper.data('loading')) {
                    var cropValue = $cropper.cropper("getCroppedCanvas", {
                        width: $cropper.data('width'),
                        height: $cropper.data('height'),
                        quality: 0.1
                    }).toDataURL();

                    $cropper.parents('.cropper-form').find(".cropperValue").val(cropValue);
                    $cropper.data('loading', false);

                    if ($cropper.data("preview")) {
                        $($cropper.data("preview")).attr("src", cropValue);
                    }
                }
            },
            cropend: function (e) {
                var cropValue = $cropper.cropper("getCroppedCanvas", {
                    width: $cropper.data('width'),
                    height: $cropper.data('height')
                }).toDataURL();

                $cropper.parents('.cropper-form').find(".cropperValue").val(cropValue);

                if ($cropper.data("preview")) {
                    $($cropper.data("preview")).attr("src", cropValue);
                }
            }
        });
    });


    $(".cropperFile").change(function () {
        var $container = $(this).closest('.cropper-form');
        var $cropper = $container.find('.cropper');

        var $this = $(this);

        var fileReader = new FileReader(),
            files = this.files,
            file;

        if (!files.length) {
            return;
        }

        file = files[0];
        //$this.val("");

        if (/^image\/\w+$/.test(file.type)) {
            fileReader.readAsDataURL(file);
            fileReader.onload = function () {
                $cropper.data('loading', false);
                $cropper.cropper('replace', this.result);
            };

        } else {
            alert("Please choose an image file.");
        }
    });

});