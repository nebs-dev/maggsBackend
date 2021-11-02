$(function () {

    var timepicker = $('.appointments-timepicker');
    var selectedDate = false;


    timepicker.on('click', '.time-button', function (e) {
        e.preventDefault();
        var now = new moment();
        var futTime = now.add(36, 'hours').format('YYYY-MM-DD HH:mm:ss+02');
        var selDate = moment(selectedDate);
        var time = selDate.add($(this).data('time'), 'hours').format('YYYY-MM-DD HH:mm:ss+02');

        // Termin can be selected only if it is 36+ hours in future
        if(time >= futTime) {
            $(this).toggleClass('active');

            var times = [];
            timepicker.find('.time-button.active').each(function () {
                var btn = $(this);
                times.push([btn.data('time'), btn.data('occupied') || 0]);
            });

            if (selectedDate) {
                $.post('/cms/appointment/add', {
                    store_id: timepicker.data('store'),
                    times: JSON.stringify(times),
                    date: selectedDate
                }, function (appointment) {
                    // remove or add to all dates/hours
                    if (times.length) {
                        if (datesWithHours.indexOf(selectedDate) === -1) {
                            datesWithHours.push(selectedDate);
                        }
                    } else {
                        datesWithHours = _.without(datesWithHours, selectedDate);
                    }

                    //todo add some kind of notification that its saved...
                });
            } else {
                alert("NO DATE SELECTED");
            }

        } else {
            $('.future36hours').show();
            setTimeout(function() {
                $('.future36hours').hide();
            }, 3000);
        }
    });

    $('.appointments-datepicker').datepicker({
        weekStart: 1,
        beforeShowDay: function (date) {
            if (datesWithHours.indexOf(moment(date).format("YYYY-MM-DD")) !== -1) {
                return 'hasHours';
            }
        }
    }).on('changeDate', function (e) {
        var date = moment(e.date).format('YYYY-MM-DD');
        selectedDate = date;
        timepicker.find('.time-button').prop('disabled', false).removeClass('active occupied');

        $.post('/cms/appointment/hours', {store_id: timepicker.data('store'), date: date}, function (hours) {
            _.each(hours, function (hour) {
                var timeSlot = timepicker.children('.time-' + hour[0]);

                timeSlot.find('.time-button').addClass('active');

                if (hour[1] !== "0") {
                    timeSlot.find('.time-button').addClass('occupied').prop('disabled', true).data('occupied', hour[1]);
                }
            });
        });
    });


});