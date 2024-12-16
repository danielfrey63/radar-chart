// Configuration object for chart settings
const CONFIG = {
    width: 800,
    height: 800,
    margin: 50,
    colors: {
        defaultSegment: '#f0f0f0',
        stroke: '#fff',
        axis: '#ddd',
        point: '#000',
        medianMin: '#ff0000',
        medianMax: '#00ff00'
    },
    text: {
        minFontSize: 6,
        maxFontSize: 14,
        fontFamily: 'Arial'
    },
    rings: {
        bereich: { inner: 0.72, outer: 0.8 },
        aspekt: { inner: 0.65, outer: 0.72 },
        frage: { inner: 0.59, outer: 0.65 },
        radar: { size: 0.57 }
    }
};

// Helper functions
const calculateRadius = () => Math.min(CONFIG.width, CONFIG.height) / 2;

// Function to get segment color
const getSegmentColor = (index, total) => {
    const hue = (index / total) * 360;
    return d3.hsl(hue, 0.5, 0.75);
};

// Function to extract the last part of a hierarchical label
function getDisplayLabel(fullLabel) {
    return fullLabel.split('.').pop();
}

// Function to draw a ring
function drawRing(data, innerRadius, outerRadius, className) {
    const svg = d3.select('#chart-container svg');
    const g = svg.select('g');
    
    const radius = calculateRadius();
    innerRadius = radius * innerRadius;
    outerRadius = radius * outerRadius;

    // Calculate the minimum font size for all segments in this ring
    const fontSize = calculateRingFontSize(data, innerRadius, outerRadius);

    const pie = d3.pie()
        .value(d => d)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const arcs = g.selectAll(`.${className}`)
        .data(pie(data.counts))
        .enter()
        .append('g')
        .attr('class', className);

    // Draw segments
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => {
            if (className === 'bereich') {
                return getSegmentColor(i, data.labels.length);
            }
            return CONFIG.colors.defaultSegment;
        })
        .attr('stroke', CONFIG.colors.stroke)
        .attr('stroke-width', 2);

    // Add labels
    arcs.each(function(d, i) {
        const fullLabel = data.labels[i];
        const label = getDisplayLabel(fullLabel);        
        const midRadius = (innerRadius + outerRadius) / 2;
        const textPathId = `textPath-${className}-${i}`;
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const segmentAngle = d.endAngle - d.startAngle;
        const isLowerHalf = midAngle > Math.PI/2 && midAngle < 3*Math.PI/2;

        // Calculate baseline offset (approximately half x-height)
        const baselineOffset = fontSize * 0.35; // Approximate x-height as 70% of font size
        const adjustedRadius = midRadius + (isLowerHalf ? baselineOffset : -baselineOffset);

        // Use 40% of the segment angle on each side (total 80%)
        const arcOffset = segmentAngle * 0.4;

        const g = d3.select(this);
        const pathData = isLowerHalf 
            ? createArcPath(adjustedRadius, midAngle, arcOffset, -arcOffset)
            : createArcPath(adjustedRadius, midAngle, -arcOffset, arcOffset);

        g.append('path')
            .attr('id', textPathId)
            .attr('d', pathData)
            .style('fill', 'none')
            .style('stroke', 'none');

        g.append('text')
            .append('textPath')
            .attr('xlink:href', `#${textPathId}`)
            .attr('startOffset', '50%')
            .attr('text-anchor', 'middle')
            .style('font-size', `${fontSize}px`)
            .style('font-family', CONFIG.text.fontFamily)
            .text(label)
            .attr('transform', !isLowerHalf ? 'rotate(180)' : '');
    });
}

// Calculate minimum font size needed for all labels in a ring
function calculateRingFontSize(data, innerRadius, outerRadius) {
    const temp = d3.select('svg')
        .append('text')
        .style('visibility', 'hidden')
        .style('font-family', CONFIG.text.fontFamily);

    const totalCount = data.counts.reduce((a, b) => a + b, 0);
    const ringHeight = (outerRadius - innerRadius) * 0.7;
    
    let minFontSize = CONFIG.text.maxFontSize;
    let limitingLabel = '';
    let limitingFactor = '';
    let limitingWidth = 0;
    let limitingHeight = 0;
    let maxWidth = 0;
    let maxLabel = '';
    let limitingArcLength = 0;
    
    // Test each label
    data.labels.forEach((fullLabel, i) => {
        const label = getDisplayLabel(fullLabel); // Use helper function
        temp.text(label);
        
        // Calculate the actual radius for this segment based on its parent
        const parentSegments = fullLabel.split('.').length - 1; // Number of parent segments
        const totalLevels = data.labels[0].split('.').length;
        const segmentRadius = innerRadius + (outerRadius - innerRadius) * (parentSegments + 0.5) / totalLevels;
        
        // Calculate actual segment angle based on count
        const segmentAngle = (2 * Math.PI * data.counts[i]) / totalCount;
        const arcLength = segmentRadius * segmentAngle * 0.8; // 80% of the actual arc length for this segment
        
        let fontSize = CONFIG.text.maxFontSize;
        temp.style('font-size', fontSize + 'px');
        let bbox = temp.node().getBBox();
        let originalWidth = bbox.width;
        
        // Reduce font size until text fits
        while ((bbox.width > arcLength || bbox.height > ringHeight) && fontSize > CONFIG.text.minFontSize) {
            if (bbox.width > arcLength && bbox.height <= ringHeight) {
                limitingFactor = 'width';
            } else if (bbox.height > ringHeight && bbox.width <= arcLength) {
                limitingFactor = 'height';
            } else {
                limitingFactor = 'both';
            }
            fontSize--;
            temp.style('font-size', fontSize + 'px');
            bbox = temp.node().getBBox();
        }
        
        if (bbox.width > maxWidth) {
            maxWidth = bbox.width;
            maxLabel = label;
        }
        
        if (fontSize < minFontSize) {
            minFontSize = fontSize;
            limitingLabel = label;
            limitingWidth = bbox.width;
            limitingHeight = bbox.height;
            limitingArcLength = arcLength;
        }
    });
    
    temp.remove();
    return minFontSize;
}

// Function to draw colored backgrounds for radar segments
function drawRadarBackgrounds(parentG, data, scales) {
    const { angle: angleScale, radius: radiusScale } = scales;
    const numPoints = data.values.length;

    // Get unique Bereich names and create index mapping
    const uniqueBereiche = [...new Set(
        data.labels.map(label => label.split('.')[0])
    )];
    const bereichToIndex = Object.fromEntries(
        uniqueBereiche.map((name, index) => [name, index])
    );

    // Create background segments
    data.values.forEach((values, i) => {
        if (!Array.isArray(values)) return;

        // Get the parent Bereich name and its index
        const fullLabel = data.labels[i];
        const bereichName = fullLabel.split('.')[0];
        const bereichIndex = bereichToIndex[bereichName];

        const angle = angleScale(i) - Math.PI/2;
        const nextAngle = angleScale(i + 1) - Math.PI/2;
        
        // Find absolute min and max indices where values exist
        const nonZeroIndices = values.map((v, idx) => ({ value: v, index: idx }))
                                    .filter(item => item.value > 0)
                                    .map(item => item.index);

        if (nonZeroIndices.length > 0) {
            const minIndex = Math.min(...nonZeroIndices);
            const maxIndex = Math.max(...nonZeroIndices);

            // Draw a single continuous segment from min to max, including gaps
            const outerRadius = radiusScale(maxIndex);
            const innerRadius = radiusScale(minIndex);
            
            // Create path for the entire segment
            const path = d3.path();
            path.moveTo(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle));
            path.lineTo(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle));
            path.arc(0, 0, outerRadius, angle, nextAngle);
            path.lineTo(innerRadius * Math.cos(nextAngle), innerRadius * Math.sin(nextAngle));
            path.arc(0, 0, innerRadius, nextAngle, angle, true);
            
            // Draw the segment with parent color and 50% opacity
            const color = getSegmentColor(bereichIndex, uniqueBereiche.length);
            
            parentG.append('path')
                .attr('d', path.toString())
                .attr('fill', color)
                .attr('opacity', 0.5) // 50% transparency
                .attr('stroke', 'none');
        }
    });
}

// Function to draw the radar chart for Frage values
function drawRadarChart(data, parentG, size) {    
    if (!validateRadarData(data)) {
        console.error('Invalid radar data');
        return;
    }

    const radius = calculateRadius() * size;
    const scales = createRadarScales(data, radius);

    // Draw in correct order: background -> median -> grid -> points
    drawRadarBackgrounds(parentG, data, scales);
    drawAxisLines(parentG, data, scales);
    drawConcentricCircles(parentG, scales.radius);
    drawMedianLines(data, parentG, size);
    drawDataPoints(parentG, data, scales);
}

function validateRadarData(data) {
    if (!data?.values?.length) {
        console.error('Invalid data structure:', data);
        return false;
    }
    return true;
}

function createRadarScales(data, radius) {
    const angleScale = d3.scaleLinear()
        .domain([0, data.values.length])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    const sizeScale = d3.scaleLinear()
        .domain([0, d3.max(data.values.map(arr => d3.max(arr)))])
        .range([3, 8]);  // Min size 3px, max size 8px

    return { angle: angleScale, radius: radiusScale, size: sizeScale };
}

function drawAxisLines(parentG, data, scales) {
    data.values.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
            console.warn('Invalid item at index', i, ':', item);
            return;
        }

        const angle = scales.angle(i);
        const x2 = scales.radius.range()[1] * Math.cos(angle - Math.PI / 2);
        const y2 = scales.radius.range()[1] * Math.sin(angle - Math.PI / 2);
        
        parentG.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', CONFIG.colors.axis)
            .attr('stroke-width', 1);
    });
}

function drawConcentricCircles(parentG, radiusScale) {
    const circles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    circles.forEach(value => {
        const r = radiusScale(value);
        
        parentG.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', r)
            .attr('fill', 'none')
            .attr('stroke', CONFIG.colors.axis)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
    });
}

function drawDataPoints(parentG, data, scales) {
    const pointsGroup = parentG.append('g')
        .attr('class', 'points-group');

    data.values.forEach((values, i) => {
        if (!Array.isArray(values)) {
            console.warn(`Invalid data item at index ${i}:`, values);
            return;
        }

        const angle = scales.angle(i);
        const nextAngle = scales.angle(i + 1);
        
        const minDistance = Math.PI / 180; // About 1 degree buffer
        const safeRange = (nextAngle - angle - 2 * minDistance);
        
        values.forEach((count, value) => {
            for (let j = 0; j < count; j++) {
                const randomAngle = angle + minDistance + (Math.random() * safeRange);
                const r = scales.radius(value);
                const x = r * Math.cos(randomAngle - Math.PI / 2);
                const y = r * Math.sin(randomAngle - Math.PI / 2);

                pointsGroup.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', 2)
                    .attr('fill', CONFIG.colors.point)
                    .attr('opacity', 1);
            }
        });
    });
}

// Function to calculate median
function calculateMedian(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    
    // Create weighted array based on counts
    let weightedValues = [];
    values.forEach((count, value) => {
        for (let i = 0; i < count; i++) {
            weightedValues.push(value);
        }
    });
    
    if (weightedValues.length === 0) return 0;
    
    weightedValues.sort((a, b) => a - b);
    const mid = Math.floor(weightedValues.length / 2);
    
    if (weightedValues.length % 2 === 0) {
        return (weightedValues[mid - 1] + weightedValues[mid]) / 2;
    }
    return weightedValues[mid];
}

// Function to draw median lines
function drawMedianLines(data, parentG, size) {
    if (!data?.values?.length) {
        console.error('Invalid data structure:', data);
        return;
    }

    const radius = calculateRadius() * size;
    const numPoints = data.values.length;
    const angleScale = d3.scaleLinear()
        .domain([0, numPoints])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, radius]);

    // Calculate medians and points
    const medianPoints = data.values.map((values, i) => ({
        ...calculateMedianPoint(values, i, numPoints, radiusScale),
        median: calculateMedian(values)
    }));

    const { minMedian, maxMedian } = findMedianRange(medianPoints);
    const colorScale = d3.scaleLinear()
        .domain([minMedian, maxMedian])
        .range([CONFIG.colors.medianMin, CONFIG.colors.medianMax]);

    drawMedianConnections(parentG, medianPoints, colorScale);
    drawMedianDots(parentG, medianPoints, colorScale);
}

function calculateMedianPoint(values, index, totalPoints, radiusScale) {
    const median = calculateMedian(values);
    const currentAngle = (2 * Math.PI * index) / totalPoints;
    const nextAngle = (2 * Math.PI * (index + 1)) / totalPoints;
    const middleAngle = (currentAngle + nextAngle) / 2;
    
    const r = radiusScale(median);
    return {
        x: r * Math.cos(middleAngle - Math.PI / 2),
        y: r * Math.sin(middleAngle - Math.PI / 2)
    };
}

function findMedianRange(points) {
    return {
        minMedian: Math.min(...points.map(p => p.median)),
        maxMedian: Math.max(...points.map(p => p.median))
    };
}

function drawMedianConnections(parentG, points, colorScale) {
    points.forEach((current, i) => {
        const next = points[(i + 1) % points.length];
        const gradientId = `gradient-${i}`;
        
        const gradient = createGradient(parentG, gradientId, current, next, colorScale);
        drawConnection(parentG, current, next, gradientId);
    });
}

function createGradient(parentG, id, start, end, colorScale) {
    const gradient = parentG.append('linearGradient')
        .attr('id', id)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', start.x)
        .attr('y1', start.y)
        .attr('x2', end.x)
        .attr('y2', end.y);

    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(start.median));

    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(end.median));

    return gradient;
}

function drawConnection(parentG, start, end, gradientId) {
    parentG.append('line')
        .attr('x1', start.x)
        .attr('y1', start.y)
        .attr('x2', end.x)
        .attr('y2', end.y)
        .attr('stroke', `url(#${gradientId})`)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');
}

function drawMedianDots(parentG, points, colorScale) {
    points.forEach(point => {
        parentG.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .attr('fill', colorScale(point.median));
    });
}

// Function to update visualization with new data
function updateVisualization(data) {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';

    const svg = createSvg(container);
    const g = createCenterGroup(svg);
    
    // Draw all components
    drawRing(data.bereichData, CONFIG.rings.bereich.inner, CONFIG.rings.bereich.outer, 'bereich');
    drawRing(data.aspektData, CONFIG.rings.aspekt.inner, CONFIG.rings.aspekt.outer, 'aspekt');
    drawRing(data.frageData, CONFIG.rings.frage.inner, CONFIG.rings.frage.outer, 'frage');
    drawRadarChart(data.frageData, g, CONFIG.rings.radar.size);
}

function createSvg(container) {
    const svg = d3.select(container)
        .append('svg')
        .attr('width', CONFIG.width)
        .attr('height', CONFIG.height)
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    return svg;
}

function createCenterGroup(svg) {
    return svg.append('g')
        .attr('transform', `translate(${CONFIG.width / 2}, ${CONFIG.height / 2})`);
}

// Add event listeners for file handling
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('csv-file-input');
    const loadButton = document.getElementById('load-csv');
    const resetButton = document.getElementById('reset');
    const downloadButton = document.getElementById('download-svg');
    const exportSvgButton = document.getElementById('export-svg');
    const exportPngButton = document.getElementById('export-png');

    // Function to handle file loading
    async function handleFileLoad(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const response = await fetch('/data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/csv'
                    },
                    body: e.target.result
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const data = await response.json();
                updateVisualization(data);
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Error uploading file. Please make sure it\'s a valid CSV with the correct format.');
            }
        };
        reader.readAsText(file);
    }

    // Handle file selection
    fileInput.addEventListener('change', (event) => {
        handleFileLoad(event.target.files[0]);
    });

    // Handle load button click
    loadButton.addEventListener('click', () => {
        // Reset the file input to ensure change event fires even for the same file
        fileInput.value = '';
        fileInput.click();
    });

    resetButton.addEventListener('click', async () => {
        try {
            // Fetch default data with reset flag
            const response = await fetch('/data?reset=true');
            if (!response.ok) {
                throw new Error('Failed to load default data');
            }
            const data = await response.json();
            updateVisualization(data);
        } catch (error) {
            console.error('Error loading default data:', error);
            alert('Error loading default data');
        }
    });

    // SVG download functionality
    function exportSVG() {
        const svgElement = document.querySelector('#chart-container svg');
        if (!svgElement) {
            alert('No chart found to export');
            return;
        }

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);
        
        // Add XML declaration and SVG namespace
        svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'radar-chart.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // PNG export functionality
    function exportPNG() {
        try {
            const svgElement = document.querySelector('#chart-container svg');
            if (!svgElement) {
                alert('No chart found to export');
                return;
            }

            // Get SVG data
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 2; // Double resolution
            
            canvas.width = svgElement.width.baseVal.value * scale;
            canvas.height = svgElement.height.baseVal.value * scale;
            
            // Create image
            const img = new Image();
            
            img.onload = function() {
                try {
                    // Set scale for higher resolution
                    ctx.scale(scale, scale);
                    
                    // Draw image
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert to PNG and download
                    canvas.toBlob(function(blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'radar-chart.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 'image/png');
                } catch (drawError) {
                    console.error('Error drawing image:', drawError);
                    alert('Error creating PNG: ' + drawError.message);
                }
            };
            
            img.onerror = function() {
                console.error('Error loading SVG');
                alert('Error loading SVG for conversion');
            };
            
            img.src = svgUrl;
            
        } catch (error) {
            console.error('Error in PNG export:', error);
            alert('Error exporting to PNG: ' + error.message);
        }
    }

    // Initialize export buttons
    if (exportSvgButton) {
        exportSvgButton.addEventListener('click', exportSVG);
    }

    if (exportPngButton) {
        exportPngButton.addEventListener('click', exportPNG);
    }
});

// Initial data load
fetch('/data')
    .then(response => response.json())
    .then(data => {
        updateVisualization(data);
    })
    .catch(error => {
        console.error('Error loading initial data:', error);
    });

function createArcPath(radius, angle, start, end) {
    return `
        M ${radius * Math.cos(angle - Math.PI/2 + start)} 
          ${radius * Math.sin(angle - Math.PI/2 + start)}
        A ${radius} ${radius} 0 0 ${start < end ? 1 : 0}
          ${radius * Math.cos(angle - Math.PI/2 + end)}
          ${radius * Math.sin(angle - Math.PI/2 + end)}
    `;
}
