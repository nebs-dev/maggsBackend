module.exports = {
    shortenString: function (string, len) {
        if (string.length > len) {
            return string.slice(0, len) + " ...";
        }
        return string;
    }
};
