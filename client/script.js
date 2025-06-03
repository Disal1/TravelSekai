// Global Google callback function
function initGoogleMaps() {
    // Attach autocomplete to all current location fields
    initAutocompleteForInputs();
}

// Google Service: Autocomplete Location
function initAutocompleteForInputs() {
    $(".location-input").each(function () {
        if (!this.hasAttribute("data-autocomplete-initialized")) {
            try {
                const autocomplete = new google.maps.places.Autocomplete(this);
                autocomplete.addListener("place_changed", () => {
                    updateLastDistanceInfo(); // Trigger when user selects a place
                });
                this.setAttribute("data-autocomplete-initialized", "true");
            } catch (err) {
                console.warn("Autocomplete failed on this input:", this, err);
            }
        }
    });
}

//Google Service: Calculate Distance between two locations
function calculateDistance(origin, destination, mode = "DRIVING", callback) {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
        {
            origins: [origin],
            destinations: [destination],
            travelMode: google.maps.TravelMode[mode],
            unitSystem: google.maps.UnitSystem.METRIC
        },
        function (response, status) {
            if (status === "OK") {
                const result = response.rows[0].elements[0];
                if (result.status === "OK") {
                    const distance = result.distance.text;
                    const duration = result.duration.text;
                    callback(null, { distance, duration });
                } else {
                    callback(`Error: ${result.status}`);
                }
            } else {
                callback(`Error: ${status}`);
            }
        }
    );
}

// Fetch the last two locations and run the calculation
function updateLastDistanceInfo(mode = "DRIVING") {
    const inputs = $(".location-input");
    if (inputs.length < 2) return;

    const origin = $(inputs[inputs.length - 2]).val();
    const destination = $(inputs[inputs.length - 1]).val();
    const infoBox = $(".distance-info").last().find(".distance-text");
    console.log(origin);
    console.log(destination);
    if (origin && destination) {
        calculateDistance(origin, destination, mode, function (err, data) {
            if (err) {
                console.log(err);
                infoBox.text("Distance unavailable");
            } else {
                infoBox.text(`${data.distance}, ${data.duration}`);
            }
        });
    }
}

// get journey details into an array
function getJourneyLocations() {
    const locations = [];

    document.querySelectorAll(".journey-segment").forEach(segment => {
        const name = segment.querySelector(".location-input")?.value.trim() || "";
        const description = segment.querySelector(".location-description")?.value.trim() || "";
        const travelMode = segment.querySelector(".mode-option.selected")?.dataset.mode || "DRIVING";
        const distance = segment.querySelector(".distance-text")?.textContent || "";

        locations.push({
            name,
            description,
            travelMode,
            distance
        });
    });

    return locations;
}


$(document).on("pagecreate", "#addJourneyPage", function () {

    $("#addLocationBtn").on("click", function (e) {
        $('.distance-info').last().fadeIn();
        e.preventDefault();

        count = $("#locationList .location-entry").length + 1;

        // Append distance-info BEFORE new location if there’s already one location
        if (count > 1) {

            const location = `
            <div class="journey-segment">
                <div class="distance-info">
                    <div class="travel-mode-options">
                        <a href="#" class="mode-option" data-mode="DRIVING">🚗</a>
                        <a href="#" class="mode-option" data-mode="WALKING">🚶</a>
                        <a href="#" class="mode-option" data-mode="BICYCLING">🚲</a>
                    </div>
                    <div class="arrow">↓</div>
                <p class="distance-text">Loading distance...</p>
                </div>
                <div class="location-entry">
                    <div class="location-number">${count}</div>
                    <input type="text" name="locations[]" class="location-input" placeholder="Enter location name">
                    <a href="#" class="remove-btn ui-btn ui-mini ui-icon-delete ui-btn-icon-notext ui-corner-all">No text</a>
                    <textarea name="locationDescriptions[]" class="" placeholder="Add a description"></textarea>
                </div>
            </div>
        `;
            $("#locationList").append(location);
        }

        // $("#locationList").append(newField);
        $("#locationList").enhanceWithin();

        // Attach autocomplete to new input
        initAutocompleteForInputs();

        // Try to calculate distance after short delay to ensure input has value
        setTimeout(updateLastDistanceInfo, 1000);
        console.log(updateLastDistanceInfo);
    });

    $(document).on("click", ".mode-option", function (e) {
        e.preventDefault();

        const selectedMode = $(this).data("mode");

        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        // Trigger a distance calculation for THIS block
        const journeySegment = $(this).closest(".journey-segment");
        const inputs = journeySegment.find(".location-input");

        // Find the two relevant inputs (previous and current)
        const allInputs = $(".location-input");
        const index = allInputs.index(inputs.first());

        if (index > 0) {
            const origin = $(allInputs[index - 1]).val();
            const destination = $(allInputs[index]).val();
            const infoBox = journeySegment.find(".distance-text");

            if (origin && destination) {
                calculateDistance(origin, destination, selectedMode, function (err, data) {
                    if (err) {
                        infoBox.text("Distance unavailable");
                    } else {
                        infoBox.text(`${data.distance}, ${data.duration}`);
                    }
                });
            }
        }
    });

    // When a location removed by clicking on the cross (X)
    $(document).on("click", ".remove-btn", function (e) {
        e.preventDefault();

        const removedSegment = $(this).closest(".journey-segment");
        const prevInput = removedSegment.prev(".journey-segment").find(".location-input");
        const nextInput = removedSegment.next(".journey-segment").find(".location-input");
        const distanceBox = removedSegment.next(".journey-segment").find(".distance-info .distance-text");

        // Remove the selected segment
        removedSegment.remove();

        //Renumber remaining entries
        $("#locationList .location-entry").each(function (index) {
            $(this).find(".location-number").text(index + 1);
        });

        // If both inputs exist, recalculate distance between them
        if (prevInput.length && nextInput.length && distanceBox.length) {
            const origin = prevInput.val();
            const destination = nextInput.val();

            if (origin && destination) {
                calculateDistance(origin, destination, "DRIVING", function (err, data) {
                    if (err) {
                        distanceBox.text("Distance unavailable");
                    } else {
                        distanceBox.text(`${data.distance}, ${data.duration}`);
                    }
                });
            }
        }
    });

    $("#journeyForm").on("submit", function(event) {
        event.preventDefault();

        const journeyFormData = {
            postTitle: $("#journey-title").val(),
            journeys: getJourneyLocations(),
            accommodation: $("#accommodation").val(),
            startDate: $("#tripStart").val(),
            endDate: $("#tripEnd").val()
        };

        console.log("postData:", journeyFormData);
    })

    // Show the confirmation popup
    $("#clearJourneyBtn").on("click", function () {
        $("#confirmClearPopup").popup("open");
    });

    // On confirm, reset the form and reload default input
    $("#confirmClear").on("click", function () {
        $("#journeyForm")[0].reset();

        // Reset location list to just the first input
        $("#locationList").html(`
            <div class="location-entry">
                <div class="location-number">1</div>
                <input type="text" name="locations[]" placeholder="Enter location name">
            </div>
        `);

        $("#locationList").enhanceWithin();

        // Close the popup
        $("#confirmClearPopup").popup("close");
    });
});

