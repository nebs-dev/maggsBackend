function randomString(length) {
    var chars = '0123456789';
    length = length ? length : 19;

    var string = '';

    for (var i = 0; i < length; i++) {
        var randomNumber = Math.floor(Math.random() * chars.length);
        string += chars.substring(randomNumber, randomNumber + 1);
    }

    return string;
}

module.exports = {
    randomString: randomString
};