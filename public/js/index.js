$(document).ready(function () {
    // Send API calls
    $("#send").click(function (e) {
        var text = $("#story").val ();
        var sentences = $("#sentences").val ();
        $.ajax({
            url: "/api/summarize",
            type: "POST",
            data: JSON.stringify({
                text: text,
                sentences: sentences
            }),
            contentType: "application/json",
            dataType: "json",
            success: function (data, status, xhr) {
                $("#the-summary").text(data.summary);
            }
        })
    });

    $("#clear").click(function (e) {
        $("#story").val("");
    });
});