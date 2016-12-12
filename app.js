var apiroot = 'https://marketplace.api.healthcare.gov/api/v1';
var apikey = 'ACA=hSL5vBVJSa';

function getJSON(path) {
    return $.getJSON(apiroot + path + ((path.indexOf('?') != -1) ? '&' : '?') + apikey);
}

function checkProviderCoverage() {
    container = $('.provider-coverage');

    pids = parseListFromCSV(container.find('textarea[name=pids]').val());
    npis = parseListFromCSV(container.find('textarea[name=npis]').val());
    container.find('.results').addClass('hidden');

    tbody = container.find('tbody');
    tbody.html('');

    for (var i = 0; i < pids.length; i += 10) {
        if (pids.length - i < 10) {
            cpids = pids.slice(i);
        } else {
            cpids = pids.slice(i, i+10);
        }

        d = getJSON('/providers/covered?planids=' + cpids.join(',') + '&providerids=' + npis.join(','));
        d.done(function(resp) {
            results = {}
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

                $(`
                    <tr>
                        <td>${i}</td>
                        <td>${r.covered.join(', ')}</td>
                        <td>${r.uncovered.join(', ')}</td>
                    </tr>
                `).appendTo(tbody);
            });

            container.find('.results').removeClass('hidden');
        });
    }
}

function checkDrugCoverage() {
    container = $('.drug-coverage');
    pids = parseListFromCSV(container.find('textarea[name=pids]').val());
    rxcuis = parseListFromCSV(container.find('textarea[name=rxcuis]').val());


    container.find('.results').addClass('hidden');
    tbody = container.find('tbody');
    tbody.html('');

    for (var i = 0; i < pids.length; i += 10) {
        if (pids.length - i < 10) {
            cpids = pids.slice(i);
        } else {
            cpids = pids.slice(i, i + 10);
        }

        d = getJSON('/drugs/covered?planids=' + cpids.join(',') + '&drugs=' + rxcuis.join(','));
        d.done(function(resp) {
            results = {}
            $.each(resp.coverage, function(i, c) {
                if (!(c.plan_id in results)) {
                    results[c.plan_id] = {'covered': [], 'uncovered': []};
                }

                if (c.coverage == 'Covered') {
                    results[c.plan_id].covered.push(c.rxcui);
                } else {
                    results[c.plan_id].uncovered.push(c.rxcui);
                }
            });

            $.each(results, function(i, r) {
                r.covered.sort();
                r.uncovered.sort();

                $(`
                    <tr>
                        <td>${i}</td>
                        <td>${r.covered.join(', ')}</td>
                        <td>${r.uncovered.join(', ')}</td>
                    </tr>
                `).appendTo(tbody);
            });

            container.find('.results').removeClass('hidden');
        });
    }
}

function loadProviderSearch() {
    container = $('.provider-search');

    zipcode = container.find('input[name=zipcode]').val();
    type = container.find('input[name=type]:checked').val();
    query = container.find('input[name=query]').val();

    d = getJSON("/providers/search?zipcode=" + zipcode + "&type=" + type + "&q=" + query);

    var table = container.find('.table');
    var warning = container.find('.warning');

    table.addClass('hidden');
    warning.addClass('hidden');

    d.done(function(data) {
        table.find('tbody').html('');

        if (data.providers.length > 0) {
            $.each(data.providers, function(i, provider) {
                $(`
                    <tr>
                        <td>${provider.provider.npi}</td>
                        <td>${provider.provider.name}</td>
                        <td>${provider.provider.specialties.join(', ')}</td>
                        <td>${provider.provider.taxonomy}</td>
                    </tr>
                `).appendTo(table.find('tbody'));
            });

            table.removeClass('hidden');
        } else {
            warning.html('No providers found');
            warning.removeClass('hidden');
        }
    });
}

function parseListFromCSV(str) {
    return $.map(str.split(","), function(e) { return e.trim(); });
}

function lookupProvider() {
    container = $('.provider-lookup');
    npi = container.find('input[name=npi]').val();

    d = getJSON('/providers/' + npi);

    res = container.find('.results');
    res.html('');
    res.addClass('hidden');

    d.done(function(resp) {
        $(`
            <dl>
                <dt>NPI</dt>
                <dd>${resp.provider.npi}</dd>

                <dt>Name</dt>
                <dd>${resp.provider.name}</dd>

                <dt>Type</dt>
                <dd>${resp.provider.provider_type}</dd>

                <dt>Accepting</dt>
                <dd>${resp.provider.accepting}</dd>

                <dt>Taxonomy</dt>
                <dd>${(resp.provider.taxonomy.length > 0) ? resp.provider.taxonomy : 'n/a' }</dd>

                <dt>Specialties</dt>
                <dd>${resp.provider.specialties.join(', ')}</dd>
            </dl>
        `).appendTo(res);
        res.removeClass('hidden');
    });
}

function lookupDrug() {
    container = $('.drug-lookup');
    rxcui = container.find('input[name=rxcui]').val();

    d = getJSON('/drugs/' + rxcui);

    res = container.find('.results');
    res.html('');
    res.addClass('hidden');

    d.done(function(resp) {
        $(`
            <dl>
                <dt>RxCUI</dt>
                <dd>${resp.drug.rxcui}</dd>

                <dt>Name</dt>
                <dd>${resp.drug.name}</dd>

                <dt>Strength</dt>
                <dd>${resp.drug.strength}</dd>

                <dt>Route</dt>
                <dd>${resp.drug.route}</dd>

                <dt>Full Name</dt>
                <dd>${resp.drug.full_name}</dd>
            </dl>
        `).appendTo(res);
        res.removeClass('hidden');
    });
}

function lookupPlans() {
    container = $('.issuer-plans');
    iid = $('input[name=issuer-id]').val();

    d = getJSON('/issuers/' + iid + '/plan-ids');

    res = container.find('.results');
    res.addClass('hidden');
    res.html('');

    d.done(function(resp) {
        $(`
            <code>${resp.plan_ids.join(', ')}</code>
        `).appendTo(res);

        res.removeClass('hidden');
    });
}

function searchDrugs() {
    container = $('.drug-search');
    container.find('.result').addClass('hidden');
    tbody = container.find('tbody');
    tbody.html('');

    var d = getJSON('/drugs/search?q=' + container.find('input[name=name]').val());

    d.done(function(resp) {
        $.each(resp.drugs, function(i, drug) {
            $(`
                <tr>
                    <td>${drug.rxcui}</td>
                    <td>${drug.full_name}</td>
                </tr>
            `).appendTo(tbody);
        });

        container.find('.results').removeClass('hidden');
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
});
