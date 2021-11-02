module.exports = {
    getBase64Blob: function (blob) {
        try {
            var imageData = blob.split(',');
            var imageMeta = imageData[0].split(':');

            var imageType = imageMeta[1].split('/');


            if (imageType[0] !== 'image') {
                return false;
            }

            var extension = '.' + imageType[1].split(';')[0];

            return {base64: imageData[1], ext: extension};

        } catch (err) {
            return false;
        }
    }
};