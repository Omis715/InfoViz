// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const slideNumber = button.dataset.slide;

        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active slide
        document.querySelectorAll('.slide').forEach(slide => slide.classList.remove('active'));
        document.getElementById(`slide-${slideNumber}`).classList.add('active');

        // Load visualization if not loaded yet
        if (slideNumber === '1' && !window.slide1Loaded) {
            loadSlide1();
            window.slide1Loaded = true;
        } else if (slideNumber === '2' && !window.slide2Loaded) {
            loadSlide2();
            window.slide2Loaded = true;
        } else if (slideNumber === '3' && !window.slide3Loaded) {
            loadSlide3();
            window.slide3Loaded = true;
        }
    });
});

// Function to load gzipped TSV files
async function tsvgz(input, row) {
    let blob = await d3.blob(`${input}.gz`);
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return d3.tsvParse(await new Response(stream).text(), row);
}

// Load slide 1 by default
window.slide1Loaded = false;
window.slide2Loaded = false;
window.slide3Loaded = false;

// Initialize first slide on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSlide1();
    window.slide1Loaded = true;
});

// SLIDE 1: Rating Evolution Over Time
function loadSlide1() {
    const margin = {top: 20, right: 80, bottom: 50, left: 60};
    const width = 1000 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    Promise.all([
        tsvgz('../data/ratings.tsv', d => ({
            id: +d['#id'],
            month: d.month,
            rating: +d.rating,
            games: +d.games
        })),
        d3.tsv('../data/players.tsv', d => ({
            id: +d['#id'],
            sex: d.sex
        }))
    ]).then(function([ratings, playersData]) {
        const players = d3.index(playersData, p => p.id);
        let zoomedDomain = null;

        function updateVisualization() {
            const yearlyData = d3.rollup(
                ratings,
                v => {
                    const avgRating = d3.mean(v, d => d.rating);
                    const avgGames = d3.mean(v, d => d.games);
                    const totalGames = d3.sum(v, d => d.games);
                    const playerCount = v.length;
                    const low = v.filter(d => d.games >= 1 && d.games <= 5).length;
                    const medium = v.filter(d => d.games >= 6 && d.games <= 15).length;
                    const high = v.filter(d => d.games >= 16).length;
                    return { avgRating, avgGames, totalGames, playerCount, low, medium, high };
                },
                d => d.month.split('-')[0]
            );

            let data = Array.from(yearlyData, ([year, values]) => ({
                year: +year,
                yearStr: year,
                ...values
            })).sort((a, b) => a.year - b.year);

            data.forEach((d, i) => {
                if (i > 0) {
                    d.deltaRating = d.avgRating - data[i - 1].avgRating;
                } else {
                    d.deltaRating = 0;
                }
            });

            drawRatingChart(data);
            drawDeltaChart(data);
        }

        function drawRatingChart(data) {
            d3.select('#rating-chart').selectAll('*').remove();

            const svg = d3.select('#rating-chart')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const xExtent = zoomedDomain || d3.extent(data, d => d.year);
            const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
            const x = d3.scaleLinear()
                .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
                .range([0, width]);

            const visibleData = zoomedDomain
                ? data.filter(d => d.year >= zoomedDomain[0] && d.year <= zoomedDomain[1])
                : data;

            const yExtent = d3.extent(visibleData, d => d.avgRating);
            const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
            const y = d3.scaleLinear()
                .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
                .range([height, 0]);

            const sizeScale = d3.scaleSqrt()
                .domain(d3.extent(data, d => d.avgRating))
                .range([5, 25]);

            const gamesExtent = d3.extent(data, d => d.avgGames);
            const colorScale = d3.scaleSequential()
                .domain([Math.log(gamesExtent[0] + 1), Math.log(gamesExtent[1] + 1)])
                .interpolator(d3.interpolateTurbo);

            const getColor = (avgGames) => colorScale(Math.log(avgGames + 1));

            svg.append('g')
                .attr('class', 'grid')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format('d')).tickSize(-height).tickFormat(''));

            svg.append('g')
                .attr('class', 'grid')
                .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format('d')));

            svg.append('g')
                .call(d3.axisLeft(y));

            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 15)
                .attr('x', -height / 2)
                .attr('dy', '1em')
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .text('Average Rating');

            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height + margin.bottom - 5)
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .text('Year');

            const brush = d3.brushX()
                .extent([[0, 0], [width, height]])
                .on('end', brushed);

            const brushGroup = svg.append('g')
                .attr('class', 'brush')
                .call(brush);

            function brushed(event) {
                if (!event.selection) return;
                const [x0, x1] = event.selection.map(x.invert);
                zoomedDomain = [Math.round(x0), Math.round(x1)];
                brushGroup.call(brush.move, null);
                updateVisualization();
            }

            if (zoomedDomain) {
                svg.append('text')
                    .attr('x', width - 10)
                    .attr('y', -5)
                    .attr('text-anchor', 'end')
                    .style('cursor', 'pointer')
                    .style('font-size', '12px')
                    .style('fill', '#0066cc')
                    .style('text-decoration', 'underline')
                    .text('Reset Zoom')
                    .on('click', function() {
                        zoomedDomain = null;
                        updateVisualization();
                    });
            }

            const tooltip = d3.select('#tooltip');

            svg.selectAll('.data-circle')
                .data(data)
                .enter()
                .append('circle')
                .attr('class', 'data-circle')
                .attr('cx', d => x(d.year))
                .attr('cy', d => y(d.avgRating))
                .attr('r', d => sizeScale(d.avgRating))
                .attr('fill', d => getColor(d.avgGames))
                .attr('opacity', 0.8)
                .attr('stroke', '#333')
                .attr('stroke-width', 1.5)
                .style('cursor', 'pointer')
                .style('pointer-events', 'all')
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('opacity', 1)
                        .attr('stroke-width', 3);

                    tooltip
                        .html(`
                            <strong>${d.yearStr}</strong><br/>
                            Avg Rating: <strong>${d.avgRating.toFixed(1)}</strong><br/>
                            Total Games: <strong>${d.totalGames.toLocaleString()}</strong><br/>
                            Players: <strong>${d.playerCount.toLocaleString()}</strong><br/>
                            <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #666;">
                                Low Activity: ${d.low.toLocaleString()}<br/>
                                Medium Activity: ${d.medium.toLocaleString()}<br/>
                                High Activity: ${d.high.toLocaleString()}
                            </div>
                        `)
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 15) + 'px')
                        .style('opacity', 1);
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('opacity', 0.8)
                        .attr('stroke-width', 1.5);

                    tooltip.style('opacity', 0);
                });

            updateLegend(data);
        }

        function drawDeltaChart(data) {
            d3.select('#delta-chart').selectAll('*').remove();

            const svg = d3.select('#delta-chart')
                .attr('width', width + margin.left + margin.right)
                .attr('height', 250)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const chartHeight = 250 - margin.top - margin.bottom;

            const x = d3.scaleLinear()
                .domain(d3.extent(data, d => d.year))
                .range([0, width]);

            const yExtent = d3.max(data, d => Math.abs(d.deltaRating));
            const y = d3.scaleLinear()
                .domain([-yExtent * 1.2, yExtent * 1.2])
                .range([chartHeight, 0]);

            svg.append('line')
                .attr('x1', 0)
                .attr('x2', width)
                .attr('y1', y(0))
                .attr('y2', y(0))
                .attr('stroke', '#999')
                .attr('stroke-width', 1);

            const barWidth = width / (data.length * 2);

            svg.selectAll('.delta-bar')
                .data(data.slice(1))
                .enter()
                .append('rect')
                .attr('class', 'delta-bar')
                .attr('x', d => x(d.year) - barWidth / 2)
                .attr('y', d => d.deltaRating > 0 ? y(d.deltaRating) : y(0))
                .attr('width', barWidth)
                .attr('height', d => Math.abs(y(d.deltaRating) - y(0)))
                .attr('fill', d => d.deltaRating > 0 ? '#10b981' : '#ef4444')
                .attr('opacity', 0.7);

            svg.append('g')
                .attr('transform', `translate(0,${chartHeight})`)
                .call(d3.axisBottom(x).tickFormat(d3.format('d')));

            svg.append('g')
                .call(d3.axisLeft(y));

            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 15)
                .attr('x', -chartHeight / 2)
                .attr('dy', '1em')
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .text('Rating Change (Year-to-Year)');

            svg.append('text')
                .attr('x', width / 2)
                .attr('y', -5)
                .style('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text('Yearly Rating Delta');
        }

        function updateLegend(data) {
            const legend = d3.select('#legend');
            legend.selectAll('*').remove();

            const legendContainer = legend.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('gap', '15px');

            legendContainer.append('span')
                .style('font-weight', 'bold')
                .text('Average Games per Year:');

            const gradientWidth = 200;
            const gradientHeight = 20;

            const minGames = d3.min(data, d => d.avgGames);
            const maxGames = d3.max(data, d => d.avgGames);

            const svgLegend = legendContainer.append('svg')
                .attr('width', gradientWidth + 50)
                .attr('height', gradientHeight + 30);

            const defs = svgLegend.append('defs');
            const gradient = defs.append('linearGradient')
                .attr('id', 'games-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%');

            const numStops = 10;
            const logMin = Math.log(minGames + 1);
            const logMax = Math.log(maxGames + 1);

            for (let i = 0; i <= numStops; i++) {
                const offset = (i / numStops) * 100;
                const logValue = logMin + (logMax - logMin) * (i / numStops);

                const legendColorScale = d3.scaleSequential()
                    .domain([logMin, logMax])
                    .interpolator(d3.interpolateTurbo);

                gradient.append('stop')
                    .attr('offset', `${offset}%`)
                    .attr('stop-color', legendColorScale(logValue));
            }

            svgLegend.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', gradientWidth)
                .attr('height', gradientHeight)
                .style('fill', 'url(#games-gradient)')
                .style('stroke', '#999')
                .style('stroke-width', 1);

            svgLegend.append('text')
                .attr('x', 0)
                .attr('y', gradientHeight + 15)
                .style('font-size', '11px')
                .style('text-anchor', 'start')
                .text(minGames.toFixed(1));

            svgLegend.append('text')
                .attr('x', gradientWidth)
                .attr('y', gradientHeight + 15)
                .style('font-size', '11px')
                .style('text-anchor', 'end')
                .text(maxGames.toFixed(1));

            legendContainer.append('span')
                .style('margin-left', '20px')
                .style('color', '#666')
                .style('font-style', 'italic')
                .text('Circle size = Rating value');
        }

        updateVisualization();
    });
}

// SLIDE 2: Men vs Women
function loadSlide2() {
    Promise.all([
        tsvgz('../data/ratings.tsv', d => ({
            id: +d['#id'],
            rating: +d.rating
        })),
        d3.tsv('../data/players.tsv', d => ({
            id: +d['#id'],
            sex: d.sex
        }))
    ]).then(function([ratings, playersData]) {
        const players = d3.index(playersData, p => p.id);

        const ratingsWithGender = ratings.map(r => ({
            ...r,
            sex: players.get(r.id)?.sex
        })).filter(d => d.sex === 'M' || d.sex === 'F');

        const genderStats = d3.rollup(
            ratingsWithGender,
            v => ({
                avgRating: d3.mean(v, d => d.rating),
                count: v.length
            }),
            d => d.sex
        );

        const data = [
            { gender: 'Men', avgRating: genderStats.get('M').avgRating, count: genderStats.get('M').count, color: '#4a90e2' },
            { gender: 'Women', avgRating: genderStats.get('F').avgRating, count: genderStats.get('F').count, color: '#e94b8a' }
        ];

        const margin = {top: 40, right: 40, bottom: 80, left: 100};
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#gender-chart')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => d.gender))
            .range([0, width])
            .padding(0.3);

        const barWidthScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.avgRating), d3.max(data, d => d.avgRating)])
            .range([x.bandwidth() * 0.4, x.bandwidth()]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgRating) * 1.1])
            .range([height, 0]);

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '14px')
            .style('font-weight', 'bold');

        svg.append('g')
            .call(d3.axisLeft(y));

        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Average Rating');

        svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => {
                const barWidth = barWidthScale(d.avgRating);
                return x(d.gender) + (x.bandwidth() - barWidth) / 2;
            })
            .attr('y', d => y(d.avgRating))
            .attr('width', d => barWidthScale(d.avgRating))
            .attr('height', d => height - y(d.avgRating))
            .attr('fill', d => d.color)
            .attr('rx', 4);

        svg.selectAll('.value-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => x(d.gender) + x.bandwidth() / 2)
            .attr('y', d => y(d.avgRating) - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text(d => d.avgRating.toFixed(1));
    });
}

// SLIDE 3: Regional Ratings
function loadSlide3() {
    Promise.all([
        tsvgz('../data/ratings.tsv', d => ({
            id: +d['#id'],
            rating: +d.rating
        })),
        d3.tsv('../data/players.tsv', d => ({
            id: +d['#id'],
            fed: d.fed
        })),
        d3.tsv('../data/countries.tsv', d => ({
            ioc: d.ioc,
            alpha3: d.alpha3
        })),
        d3.tsv('../data/iso3.tsv', d => ({
            alpha3: d['#alpha3'],
            region: d.region
        }))
    ]).then(function([ratings, playersData, countries, iso3]) {
        const players = d3.index(playersData, p => p.id);
        const countryToAlpha3 = d3.index(countries, c => c.ioc);
        const alpha3ToRegion = d3.index(iso3, i => i.alpha3);

        const ratingsWithRegion = ratings.map(r => {
            const player = players.get(r.id);
            if (!player) return { ...r, region: 'Unknown' };

            const country = countryToAlpha3.get(player.fed);
            if (!country) return { ...r, region: 'Unknown' };

            const regionData = alpha3ToRegion.get(country.alpha3);
            return {
                ...r,
                region: regionData?.region || 'Unknown'
            };
        });

        const regionStats = d3.rollup(
            ratingsWithRegion.filter(d => d.region !== 'Unknown'),
            v => ({
                avgRating: d3.mean(v, d => d.rating),
                count: v.length
            }),
            d => d.region
        );

        const data = Array.from(regionStats, ([region, stats]) => ({
            region,
            avgRating: stats.avgRating,
            count: stats.count
        })).sort((a, b) => b.avgRating - a.avgRating);

        const regionColors = {
            'Europe': '#4a90e2',
            'Asia': '#e94b8a',
            'Americas': '#50c878',
            'Africa': '#f5a623',
            'Oceania': '#9b59b6'
        };

        data.forEach(d => {
            d.color = regionColors[d.region] || '#999';
        });

        const width = 960;
        const height = 600;

        const svg = d3.select('#region-chart')
            .attr('width', width)
            .attr('height', height);

        const ratingExtent = d3.extent(data, d => d.avgRating);
        const colorScale = d3.scaleSequential()
            .domain(ratingExtent)
            .interpolator(d3.interpolateRdYlGn);

        // Scales
        const sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.count)])
            .range([40, 100]);

        // Map positions for regions (approximate geographical locations)
        const regionPositions = {
            'Europe': { x: 520, y: 200 },
            'Asia': { x: 720, y: 250 },
            'Africa': { x: 530, y: 400 },
            'Americas': { x: 250, y: 300 },
            'Oceania': { x: 820, y: 450 }
        };

        // Assign positions to data
        data.forEach(d => {
            d.x = regionPositions[d.region]?.x || 400;
            d.y = regionPositions[d.region]?.y || 300;
        });

        const tooltip = d3.select('#tooltip');

        // Draw circles
        const circles = svg.selectAll('.region-circle')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'region-circle')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Create CIRCLES (not rectangles!)
        circles.append('circle')
            .attr('r', d => sizeScale(d.count))
            .attr('fill', d => colorScale(d.avgRating))
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', 4)
                    .attr('stroke', '#000');

                tooltip
                    .html(`
                        <strong>${d.region}</strong><br/>
                        Avg Rating: <strong>${d.avgRating.toFixed(1)}</strong><br/>
                        Player Records: <strong>${d.count.toLocaleString()}</strong>
                    `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px')
                    .style('opacity', 1);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#333');

                tooltip.style('opacity', 0);
            });

        // Region labels
        circles.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.3em')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .text(d => d.region);

        // Rating labels
        circles.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.2em')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .text(d => d.avgRating.toFixed(1));

        // Add legend for circle size
        const legendGroup = svg.append('g')
            .attr('transform', `translate(50, ${height - 120})`);

        legendGroup.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Circle size = Player Records');

        const legendSizes = [
            { count: d3.min(data, d => d.count), label: 'Min' },
            { count: d3.max(data, d => d.count), label: 'Max' }
        ];

        legendSizes.forEach((item, i) => {
            const radius = sizeScale(item.count);
            legendGroup.append('circle')
                .attr('cx', i * 100 + 20)
                .attr('cy', 40)
                .attr('r', radius / 2)
                .attr('fill', 'none')
                .attr('stroke', '#666')
                .attr('stroke-width', 1);

            legendGroup.append('text')
                .attr('x', i * 100 + 20)
                .attr('y', 70)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .text(item.count.toLocaleString());
        });

        const gradientWidth = 200;
        const gradientHeight = 20;

        const gradientLegend = svg.append('g')
            .attr('transform', `translate(${width - gradientWidth - 50}, 50)`);

        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'rating-gradient-slide3')
            .attr('x1', '0%')
            .attr('x2', '100%');

        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const offset = (i / numStops) * 100;
            const value = ratingExtent[0] + (ratingExtent[1] - ratingExtent[0]) * (i / numStops);
            gradient.append('stop')
                .attr('offset', `${offset}%`)
                .attr('stop-color', colorScale(value));
        }

        gradientLegend.append('text')
            .attr('x', gradientWidth / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Average Rating');

        gradientLegend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', gradientWidth)
            .attr('height', gradientHeight)
            .style('fill', 'url(#rating-gradient-slide3)')
            .style('stroke', '#999')
            .style('stroke-width', 1);

        gradientLegend.append('text')
            .attr('x', 0)
            .attr('y', gradientHeight + 15)
            .style('font-size', '10px')
            .text(ratingExtent[0].toFixed(0));

        gradientLegend.append('text')
            .attr('x', gradientWidth)
            .attr('y', gradientHeight + 15)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .text(ratingExtent[1].toFixed(0));
    });
}
