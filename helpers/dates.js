var time = require('time')(Date);

function dateToZurichTime(date) {
    return date.setTimezone("Europe/Zurich");
}
function dateToString(date, extended) {
    date = dateToZurichTime(date);
    var day = twoDigits(date.getDate());
    var month = twoDigits(date.getMonth() + 1);
    var year = date.getFullYear();
    var hours = twoDigits(date.getHours());
    var minutes = twoDigits(date.getMinutes());

    var dateVar = day + '.' + month + '.' + year;

    if(extended) {
        dateVar += ' ' + hours + ':' + minutes;
    }

    return dateVar;
}

function dayToString(date) {
    date = dateToZurichTime(date);
    var day = twoDigits(date.getDate());
    var month = twoDigits(date.getMonth() + 1);
    var year = date.getFullYear();

    return day + '.' + month + '.' + year;
}

function timeToString(date) {
    date = dateToZurichTime(date);
    var hours = twoDigits(date.getHours());
    var minutes = twoDigits(date.getMinutes());

    return hours + ':' + minutes;
}

function dayOfTheWeek(date) {
    date = dateToZurichTime(date);

    return 'day_' + date.getDay();
}

function stringToDate(date, dateOnly) {
    if (dateOnly) {
        var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
        date = new Date(date.replace(pattern, '$3-$2-$1'));
        return date;
    }
    var pattern = /(\d{2})\.(\d{2})\.(\d{4})\ (\d{2})\:(\d{2})/;
    date = new Date(date.replace(pattern, '$3-$2-$1T$4:$5'));
    date.setHours(date.getHours()-1);
    return date;
}

function twoDigits(number) {
    if (number < 10) {
        return '0' + number;
    }
    return number;
}

function isADateString(dateString) {
    var pattern = /(\d{2})\.(\d{2})\.(\d{4})\ (\d{2})\:(\d{2})/;
    var date = new Date(dateString.replace(pattern, '$3-$2-$1T$4:$5'));
    if (date == 'Invalid Date') {
        return false;
    }
    return true;
}


function dateGreaterThan(param, date2) {
    if (typeof date2 == "string") {
        date2 = stringToDate(date2);
    }
    var date = stringToDate(param);
    return date > date2;
}


function dateGreaterOrEqualThan(param, date2) {
    if (typeof date2 == "string") {
        date2 = stringToDate(date2);
    }
    var date = stringToDate(param);
    return date >= date2;
}

function groupInteractionsByDay(interactions) {
    var last_date = null;
    var results = {};
    for (var i in interactions) {
        var currentInteraction = interactions[i];
        var currentDate = dayToString(dateToZurichTime(currentInteraction.createdAt));
        if (currentDate == last_date) {
            results[currentDate].push(currentInteraction);
        } else {
            last_date = currentDate;
            results[currentDate] = [currentInteraction];
        }
    }

    return results;
}

function minutesDiff(date1, date2) {
    var timeDiff = Math.abs(date1.getTime()-date2.getTime());
    return Math.round(timeDiff/60000);
}
module.exports = {
    dateToString: dateToString,
    dayToString: dayToString,
    stringToDate: stringToDate,
    customValidators: {
        dateGreaterThan: dateGreaterThan,
        isADateString: isADateString,
        dateGreaterOrEqualThan: dateGreaterOrEqualThan
    },
    groupInteractionsByDay: groupInteractionsByDay,
    timeToString: timeToString,
    dayOfTheWeek: dayOfTheWeek,
    dateToZurichTime: dateToZurichTime,
    minutesDiff: minutesDiff
}