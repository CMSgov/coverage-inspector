var CURRENT_MARKET_YEAR = '2020'; // TODO: Allow this to be set by the user

var apiroot = 'https://marketplace.api.healthcare.gov/api/v1';
var keystring  = 'apikey=4f3ee303150110ff194e9b51b2f605d7';

function getJSON(path, year) {
    if (!year) year = CURRENT_MARKET_YEAR;
    var yearString = 'year=' + year;
    return $.getJSON(apiroot + path + ((path.indexOf('?') != -1) ? '&' : '?') + keystring + '&' + yearString);
}

function checkProviderCoverage() {
    var container = $('.provider-coverage');

    var pids = parseListFromCSV(container.find('textarea[name=pids]').val());
    var npis = parseListFromCSV(container.find('textarea[name=npis]').val());
    var res = container.find('.results');
    res.addClass('hidden');

    var table = res.find('table');
    table.addClass('hidden');

    var tbody = table.find('tbody');
    tbody.html('');

    for (var i = 0; i < pids.length; i += 10) {
        var cpids = [];
        if (pids.length - i < 10) {
            cpids = pids.slice(i);
        } else {
            cpids = pids.slice(i, i+10);
        }

        var d = getJSON('/providers/covered?planids=' + cpids.join(',') + '&providerids=' + npis.join(','));
        d.done(function(resp) {
            var results = {};
            $.each(resp.coverage, function(i, c) {
                if (!(c.plan_id in results)) {
                    results[c.plan_id] = {'covered': [], 'uncovered': []};
                }

                if (c.coverage == 'Covered') {
                    results[c.plan_id].covered.push(c.npi);
                } else {
                    results[c.plan_id].uncovered.push(c.npi);
                }
            });

            $.each(results, function(i, r) {
                r.covered.sort();
                r.uncovered.sort();

                $('<tr>' +
                    '<td>' + i + '</td>' +
                    '<td>' + r.covered.join(', ') + '</td>' +
                    '<td>' + r.uncovered.join(', ') + '</td>' +
                '</tr>').appendTo(tbody);
            });

            table.removeClass('hidden');
        });

        d.fail(function() { $('<p class="text-danger">Error loading coverage data</p>').appendTo(res); });
        d.always(function() { res.removeClass('hidden'); });
    }
}

function checkDrugCoverage() {
    var container = $('.drug-coverage');
    var pids = parseListFromCSV(container.find('textarea[name=pids]').val());
    var rxcuis = parseListFromCSV(container.find('textarea[name=rxcuis]').val());

    var res = container.find('.results');
    res.addClass('hidden');

    var table = res.find('table');
    table.addClass('hidden');

    var tbody = table.find('tbody');
    tbody.html('');

    for (var i = 0; i < pids.length; i += 10) {
        var cpids = [];
        if (pids.length - i < 10) {
            cpids = pids.slice(i);
        } else {
            cpids = pids.slice(i, i + 10);
        }

        d = getJSON('/drugs/covered?planids=' + cpids.join(',') + '&drugs=' + rxcuis.join(','));
        d.done(function(resp) {
            var results = {};
            $.each(resp.coverage, function(i, c) {
                if (!(c.plan_id in results)) {
                    results[c.plan_id] = {'covered': [], 'uncovered': []};
                }

                if (c.coverage == 'Covered') {
                    results[c.plan_id].covered.push(c.rxcui);
                } else {
                    results[c.plan_id].uncovered.push(c.rxcui);
                }

                table.removeClass('hidden');
            });

            $.each(results, function(i, r) {
                r.covered.sort();
                r.uncovered.sort();

                $('<tr>' +
                    '<td>' + i + '</td>' +
                    '<td>' + r.covered.join(', ') + '</td>' +
                    '<td>' + r.uncovered.join(', ') + '</td>' +
                '</tr>').appendTo(tbody);
            });
        });

        d.fail(function() { $('<p class="text-danger">Error loading coverage data</p>').appendTo(res); });
        d.always(function() { res.removeClass('hidden'); });
    }
}

function loadProviderSearch() {
    var container = $('.provider-search');

    var zipcode = container.find('input[name=zipcode]').val();
    var type = container.find('input[name=type]:checked').val();
    var query = container.find('input[name=query]').val();

    var d = getJSON("/providers/search?zipcode=" + zipcode + "&type=" + type + "&q=" + query);

    var res = container.find('.results');
    var table = container.find('.table');
    table.addClass('hidden');

    d.done(function(data) {
        table.find('tbody').html('');

        if (data.providers.length > 0) {
            $.each(data.providers, function(i, provider) {
                $('<tr>' +
                    '<td>' + provider.provider.npi + '</td>' +
                    '<td>' + provider.provider.name + '</td>' +
                    '<td>' + provider.provider.specialties.join(', ') + '</td>' +
                    '<td>' + provider.provider.taxonomy + '</td>' +
                '</tr>').appendTo(table.find('tbody'));
            });

            table.removeClass('hidden');
        } else {
            $('<p class="text-danger">No providers found</p>').appendTo(res);
        }
    });
}

function parseListFromCSV(str) {
    return $.map(str.split(","), function(e) { return e.trim(); });
}

function lookupProvider() {
    var container = $('.provider-lookup');
    var npi = container.find('input[name=npi]').val();

    // validate the given npi
    if (npi.match(/[0-9]{10}/) != npi) {
        var fgroup = container.find('.form-group');
        fgroup.addClass('has-error');
        $('<span class="help-block">Invalid NPI (must be a 10-digit number)</span>').appendTo(fgroup);
        return false;
    }

    var d = getJSON('/providers/' + npi);

    var res = container.find('.results');
    res.html('');
    res.addClass('hidden');

    d.done(function(resp) {
        $('<dl>' +
            '<dt>NPI</dt>' +
            '<dd>' + resp.provider.npi + '</dd>' +

            '<dt>Name</dt>' +
            '<dd>' + resp.provider.name + '</dd>' +

            '<dt>Type</dt>' +
            '<dd>' + resp.provider.provider_type + '</dd>' +

            '<dt>Accepting</dt>' +
            '<dd>' + resp.provider.accepting + '</dd>' +

            '<dt>Taxonomy</dt>' +
            '<dd>' + ((resp.provider.taxonomy.length > 0) ? resp.provider.taxonomy : 'n/a') + '</dd>' +

            '<dt>Specialties</dt>' +
            '<dd>' + resp.provider.specialties.join(', ') + '</dd>' +
        '</dl>').appendTo(res);
    });

    d.fail(function() {
        $('<p class="text-danger">Provider not found</p>').appendTo(res);
    });

    d.always(function() {
        res.removeClass('hidden');
    });
}

function lookupDrug() {
    var rxrx = /[0-9]{4,6}/;

    var container = $('.drug-lookup');
    var rxcui = container.find('input[name=rxcui]').val();

    if (!rxrx.test(rxcui) || rxcui.match(rxrx)[0] != rxcui) {
        var fg = container.find('.form-group');
        fg.addClass('has-error');
        $('<span class="help-block">Invalid RxCUI (must be a 4-6 digit number)</span>').appendTo(fg);
        return false;
    }

    var d = getJSON('/drugs/' + rxcui);

    var res = container.find('.results');
    res.html('');
    res.addClass('hidden');

    d.done(function(resp) {
        $('<dl>' +
            '<dt>RxCUI</dt>' +
            '<dd>' + resp.drug.rxcui + '</dd>' +

            '<dt>Name</dt>' +
            '<dd>' + resp.drug.name + '</dd>' +

            '<dt>Strength</dt>' +
            '<dd>' + resp.drug.strength + '</dd>' +

            '<dt>Route</dt>' +
            '<dd>' + resp.drug.route + '</dd>' +

            '<dt>Full Name</dt>' +
            '<dd>' + resp.drug.full_name + '</dd>' +
        '</dl>').appendTo(res);
    });

    d.fail(function() {
        $('<p class="text-danger">RxCUI not found</p>').appendTo(res);
    });

    d.always(function() {
        res.removeClass('hidden');
    });
}

function lookupPlans() {
    var iidrx = /[0-9]{5}/;
    var container = $('.issuer-plans');
    var iid = $('input[name=issuer-id]').val();
    var year = $('#issuer-id-year').val();

    if (!iidrx.test(iid) || iid.match(iidrx)[0] != iid) {
        var fg = container.find('.form-group');
        fg.addClass('has-error');
        $('<span class="help-block">Invalid issuer ID (must be a 5 digit number)</span>').appendTo(fg);
        return false;
    }

    var d = getJSON('/issuers/' + iid + '/plan-ids', year);

    var res = container.find('.results');
    res.addClass('hidden');
    res.html('');

    d.done(function(resp) {
        if (resp.plan_ids.length > 0) {
            $('<code>' + resp.plan_ids.join(', ') + '</code>').appendTo(res);
        } else {
            // returns 200 w/ no plans on failure
            $('<p class="text-danger">Issuer plans not found</p>').appendTo(res);
        }

        res.removeClass('hidden');
    });
}

function searchDrugs() {
    var container = $('.drug-search');
    var tbody = container.find('tbody');
    tbody.html('');

    var d = getJSON('/drugs/search?q=' + container.find('input[name=name]').val());

    var table = container.find('.table');
    table.addClass('hidden');

    var res = container.find('.results');
    res.addClass('hidden');

    d.done(function(resp) {
        if (resp.drugs.length > 0) {
            $.each(resp.drugs, function(i, drug) {
                $('<tr>' +
                    '<td>' + drug.rxcui + '</td>' +
                    '<td>' + drug.full_name + '</td>' +
                '</tr>').appendTo(tbody);
                table.removeClass('hidden');
            });
        } else {
            $('<p class="text-danger">No drugs found</p>').appendTo(res);
        }

        res.removeClass('hidden');
    });
}

$(function() {
    // Load providers given a zipcode, type & name query
    $('.provider-search form').submit(function(e) {
        e.preventDefault();
        loadProviderSearch();
    });

    $('.npi form').submit(function(e) {
        e.preventDefault();
        loadNPI();
    });

    $('.provider-coverage form').submit(function(e) {
        e.preventDefault();
        checkProviderCoverage();
    });

    $('.drug-coverage form').submit(function(e) {
        e.preventDefault();
        checkDrugCoverage();
    });

    $('.provider-lookup form').submit(function(e) {
        e.preventDefault();
        lookupProvider();
    });

    $('.drug-lookup form').submit(function(e) {
        e.preventDefault();
        lookupDrug();
    });

    $('.issuer-plans form').submit(function(e) {
        e.preventDefault();
        lookupPlans();
    });

    $('.drug-search form').submit(function(e) {
        e.preventDefault();
        searchDrugs();
    });

    // clear validation messages on change
    $('input,textarea').keydown(function(e) {
        $('.form-group').removeClass('has-error');
        $('.text-danger').remove();
        $('.help-block').remove();
    });
});
