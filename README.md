# Chess Rating Visualizations

An interactive data visualization project exploring FIDE chess ratings, player demographics, and regional patterns using D3.js.

## Project Overview

This project presents three independent visualizations that answer key questions about chess ratings worldwide:

1. **Rating Evolution Over Time** - How has the global average rating evolved, and is this related to player activity?
2. **Men vs Women Ratings** - How do genders rank in terms of average rating, and how reliable is the comparison given differences in participation?
3. **Regional Ratings** - Which world region has the highest average rating?

## Live Demo

Open [index.html](index.html) in a web browser or serve it using a local server:

```bash
python -m http.server 8000
# Then navigate to http://localhost:8000/
```

## Data Sources

The visualizations use the following datasets:

- **ratings.tsv.gz** (37MB compressed) - FIDE rating data including player IDs, ratings, and game counts
- **players.tsv** - Player demographic information (gender, birth year, federation)
- **countries.tsv** - Country codes and names
- **iso3.tsv** - ISO3 country codes mapped to world regions

All data files are located in the `data/` directory.

## Implementation

### Architecture

The project uses a modular architecture where each visualization is a standalone HTML file with embedded JavaScript:

```
2025-fide-main/
├── index.html                 # Main entry point with tabbed navigation
├── viz/
│   ├── 01-ratingOverTime.html # Rating evolution visualization
│   ├── 02-MenVsWomen.html     # Gender comparison visualization
│   └── 03-RegionRatings.html  # Regional ratings visualization
├── css/
│   ├── index.css              # Styles for main tabbed interface
│   └── viz.css                # Shared styles for visualizations
└── data/                      # Data files
```

### Technology Stack

- **D3.js v7.8.5** - Primary visualization library
- **Vanilla JavaScript** - No frameworks, pure JS for simplicity
- **HTML5 & CSS3** - Modern web standards



### Individual Visualizations

**[viz/01-ratingOverTime.html](viz/01-ratingOverTime.html)**
- Question: How has the global average rating evolved over time?
- Encoding: Circles encode total games, color encodes rating change
- Interaction: Brush to zoom into specific time periods

**[viz/02-MenVsWomen.html](viz/02-MenVsWomen.html)**
- Question: How do genders rank in terms of average rating?
- Encoding: Bar width encodes player count (reliability indicator)
- Shows both rating difference and sample size disparity

**[viz/03-RegionRatings.html](viz/03-RegionRatings.html)**
- Question: Which world region has the highest average rating?
- Encoding: Circle size encodes player count, color encodes rating
- Geographic positioning for intuitive region comparison
