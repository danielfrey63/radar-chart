# Radar Chart Application Features

## 1. Hierarchical Data Visualization
### Description
The application visualizes hierarchical data in a circular layout with three levels: level 1, level 2, and level 3.

### Acceptance Criteria
- Each level is represented by concentric rings with specific radius ratios:
  - level 1: outer ring (0.72-0.8 of total radius)
  - level 2: middle ring (0.65-0.72 of total radius)
  - level 3: inner ring (0.59-0.65 of total radius)
- level 1 ring segments are color-coded using HSL color space:
  - Each segment gets a unique hue value calculated as (index/total_segments * 360)
  - Saturation fixed at 0.5
  - Lightness fixed at 0.75
- Labels are dynamically sized based on available space:
  - Font size is calculated to fit within segment arc length and ring height
  - Minimum font size: 6px
  - Maximum font size: 14px
  - Font family: Arial
  - Text is aligned along the middle radius of each ring segment
  - Text is centered within its segment arc
  - Text is automatically flipped 180° if it appears in the lower half of the ring to maintain readability
- Parent-child relationships are visually represented:
  - Child segments are aligned within the angular span of their parent segment
  - Segment sizes in level 1 and level 2 are proportional to the count of their contained level 3 elements
  - All segments of a child level must have a corresponding parent in the level above

## 2. CSV Data Import
### Description
Users can import custom data through CSV file uploads

Example CSV structure:
```csv
level 1,level 2,level 3,metric,value
domain1,category1,item1,metric1,8
domain1,category1,item2,metric1,6
domain1,category2,item3,metric2,9
domain2,category3,item4,metric1,7
```

### Acceptance Criteria
- Accepts CSV files with specific column structure (level 1, level 2, level 3, metric, value)
- Validates CSV format and data integrity
- Displays error messages for invalid data
- Updates visualization immediately after successful import

## 3. Radar Chart Display
### Description
Inner circle displays a radar chart showing value distributions

### Acceptance Criteria
- Radar chart structure:
  - Divided into segments by radial axis lines, one for each metric
  - Axis lines align with the segment borders of the outer rings (level 1, 2, and 3)
  - Values are plotted in the areas between two adjacent axis lines
  - Shows concentric circles for value scales from 0 (center) to 10 (outer edge)
- Data points are:
  - Plotted within their corresponding segment between two axis lines
  - Positioned randomly within their segment to avoid overlapping
  - Represented as individual dots without connecting lines

## 4. Export Functionality
### Description
Allows users to export the visualization in different formats

### Acceptance Criteria
- Supports SVG export with preserved vector quality
- Supports PNG export with customizable resolution
- Maintains all visual elements in exports
- Provides immediate download of exported files

## 5. Data Reset Capability
### Description
Allows users to reset the visualization to default data

### Acceptance Criteria
- Provides a reset button in the UI
- Loads default data from server
- Clears any currently loaded custom data
- Updates visualization immediately after reset

## 6. Responsive Layout
### Description
Provides a clean, responsive interface for the visualization

### Acceptance Criteria
- Centers visualization in viewport
- Maintains aspect ratio of the chart
- Provides clear button layout for controls
- Supports standard screen sizes without distortion

## 7. Data Processing and Aggregation
### Description
Processes raw CSV data into hierarchical structure with value aggregation

### Acceptance Criteria
- Correctly counts occurrences at each level
- Maintains proper parent-child relationships in data structure
- Aggregates value distributions for radar chart
- Handles missing or incomplete data gracefully

## 8. Dynamic Text Scaling
### Description
Automatically scales text labels based on available space

### Acceptance Criteria
- Calculates optimal font size for each ring segment
- Ensures text remains readable (minimum font size enforced)
- Handles long labels appropriately
- Maintains consistent text orientation for readability
- Ensures all lables are of the same size in each ring

## 9. Server-Side Data Management
### Description
Manages data state and processing on the server

### Acceptance Criteria
- Maintains current data state
- Provides API endpoints for data operations
- Handles concurrent requests appropriately
- Returns appropriate error responses for invalid requests

## 10. Data Point Background
### Description
Each segment in the radar chart has a shaded background that represents the range of data points within that segment

### Acceptance Criteria
- Background shading characteristics:
  - Each segment between axis lines has a semi-transparent background
  - Background color matches the parent level 1 segment color with 50% opacity
  - Background extends only between the minimum and maximum value points in each segment
  - Background is bounded by:
    - Adjacent axis lines radially
    - Minimum value radius where data points exist
    - Maximum value radius where data points exist
- Visual properties:
  - Color inherited from parent level 1 segment (using HSL color space)
  - Opacity: 0.5 (50% transparency)
  - No stroke (border)

## 11. Median Value Visualization
### Description
Displays median values with special indicators and connections

### Acceptance Criteria
- Calculates and displays median values accurately
- Shows color-coded indicators for min/max medians
- Connects median points with gradient lines
- Updates median display when data changes
