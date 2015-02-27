// **************************************************************************
// ******************************** BACK-END ********************************
// **************************************************************************


// OBJECTS
function Grid(dimensions, value) {
    this.dimensions = dimensions;
    this.value = value;

    // returns 2D grid (array of arrays) 
    this.create_grid = function() {                    
        var result = [];
        for (var x = 0; x < this.dimensions[0]; x++) {
            result.push([]);
            for (var y = 0; y < this.dimensions[1]; y++) {
                result[x].push(this.value);
            };
        };
        
        return result;
    };

    this.contents = this.create_grid();
};            

var main_grid = new Grid(DIMENSIONS, Cellstate.dead);
var ghost_grid = new Grid(DIMENSIONS, false);            

// toggles value of cell between alive and dead
function cell_toggle(grid, cell_coords) {                
    if (grid.contents[cell_coords[0]][cell_coords[1]] == Cellstate.alive) {
        grid.contents[cell_coords[0]][cell_coords[1]] = Cellstate.dead;
    }
    else {
        grid.contents[cell_coords[0]][cell_coords[1]] = Cellstate.alive;                    
    };
};

// turns cell on 
function cell_on(grid, cell_coords) {                
    grid.contents[cell_coords[0]][cell_coords[1]] = Cellstate.alive;                
};

// turns cell off
function cell_off(grid, cell_coords) {                
    grid.contents[cell_coords[0]][cell_coords[1]] = Cellstate.dead;
};

// puts pattern (array of coords in *coords* place) on a grid
function put_pattern(grid, pattern, coords) {
    var width = DIMENSIONS[0];
    var height = DIMENSIONS[1];

    // iterating through coords of pattern cells
    for (var idx in pattern) {
        // adding cell coord to *coords*
        var x = coords[0] + pattern[idx][0];
        var y = coords[1] + pattern[idx][1];

        // checking boundaries
        if ((x >= 0) && (x < width) && (y >= 0) && (y < height)) {                        
            cell_on(grid, [x, y]);
        };
    };
};

// calculates new generation and modifies grid accordingly
function next_generation() {
    var temp_grid = new Grid(DIMENSIONS, Cellstate.dead);

    for (var x = 0; x < DIMENSIONS[0]; x++) {
        for (var y = 0; y < DIMENSIONS[0]; y++) {
            var live_neighbors = count_neighbors(x, y) ;
            // cell is alive
            if (main_grid.contents[x][y] == Cellstate.alive) {
                // underpopulated - dies
                if (live_neighbors < 2) {
                    temp_grid.contents[x][y] = Cellstate.dying;
                }
                // optimal conditions - lives
                else if ((live_neighbors == 2) || (live_neighbors == 3)) {
                    temp_grid.contents[x][y] = Cellstate.alive;                                
                }
                // overcrowded - dies
                else if (live_neighbors > 2) {
                    temp_grid.contents[x][y] = Cellstate.dying;
                };
            }
            // cell is dead and has three live neighbors - reproduction
            else if ((!(main_grid.contents[x][y] == Cellstate.alive)) && (live_neighbors == 3)) {
                temp_grid.contents[x][y] = Cellstate.alive;
            }
            // turn dying ones to dead
            else if (temp_grid.contents[x][y] == Cellstate.dying) {
                temp_grid.contents[x][y] == Cellstate.dead;
            };
        };
    };

    main_grid.contents = temp_grid.contents;

    // adding # of living cells to histogram
    histogram.data1.unshift(board.cells_alive);
}

// returns #_of_true_neighbors
// neighbors beyond an edge are false
function count_neighbors(x, y) {                
    var offsets = [[-1,-1], [0,-1], [1,-1],
                   [-1, 0],         [1, 0],
                   [-1, 1], [0, 1], [1, 1]];

    var width = DIMENSIONS[0];
    var height = DIMENSIONS[1];
    var true_neighbors = 0;                

    for (var idx in offsets) {
        var neigh_x = x + offsets[idx][0];
        var neigh_y = y + offsets[idx][1];

        // weeding out neighbors beyond grid
        if (!((neigh_x < 0) 
              || (neigh_x > (width - 1))
              || (neigh_y < 0)
              || (neigh_y > (height - 1)))) {
            // counting neighbors
            if (main_grid.contents[neigh_x][neigh_y] == Cellstate.alive) {
                true_neighbors++;
            };
        };
    };
    return true_neighbors;
};

