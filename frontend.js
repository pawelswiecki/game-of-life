var DIMENSIONS = [75, 60];            
var MARGIN_RATIO = 10;
var CANVAS_ID = "#canv1";

// LOGIC: 0 or 1 = dead; 2 = alive 
// GRAPHICS: 0 = not visible; 1 and 2 = visible
var Cellstate = {};
Cellstate.dead = 0;
Cellstate.dying = 1;
Cellstate.alive = 2;

var board = {};
board.cell_size = []; // array of x and y-size
board.margin; // array of x and y-dimensions            
board.delay; // delay between generations
board.inter1; // interval for delay
board.is_running = false;            

var mouse = {};
mouse.left_button_drawing = false;            
mouse.value_on_down = Cellstate.dead;            
mouse.left_button_drag = false;
mouse.dragged_pattern = [];            

// **************************************************************************
// ******************************** FRONT-END *******************************
// **************************************************************************

$(document).ready(function() {
    board.delay = $("#form_delay").val();
    redraw_all();                

    $(CANVAS_ID).mousedown(function(event) {
        // left mouse button was pressed
        if(event.which === 1) {
            // draw alive cell
            var coords = get_coords(event);
        
            coords = pixel_coords_to_cell_coords(coords);
            mouse.value_on_down = main_grid.contents[coords[0]][coords[1]];
            cell_toggle(main_grid, coords);

            redraw_all();

            mouse.left_button_drawing = true;
        };                    
    });

    $(CANVAS_ID).mouseup(function(event) {
        // left mouse button was released
        if(event.which === 1) {
            mouse.left_button_drawing = false;
            
            // putting pattern if dragging
            if (mouse.left_button_drag) {
                var coords = get_coords(event);
        
                var coords = pixel_coords_to_cell_coords(coords);
                
                put_pattern(main_grid, mouse.dragged_pattern, coords);
                mouse.left_button_drag = false;
                ghost_grid = new Grid(DIMENSIONS, false);
                redraw_all();
            }
        }
    });                             

    // right mouse button clicked on canvas - rotate right
    $(CANVAS_ID).mousedown(function(event) {
        if(event.button == 2) {                       
            var temp_pattern = [];
            for (var idx in mouse.dragged_pattern) {
                var x = mouse.dragged_pattern[idx][0];
                var y = mouse.dragged_pattern[idx][1];

                temp_pattern[idx] = [];
                temp_pattern[idx][0] = -y;
                temp_pattern[idx][1] = x;
            }

            mouse.dragged_pattern = temp_pattern;
        };                       
    });

    // mouseup anywhere but on main canvas
    $(document).mouseup(function(event) { 
        var coords = get_coords(event);                     
        // true if *coords* are outside of canvas
        if ((coords[0] < 0) || (coords[0] > $(CANVAS_ID).width())
            || (coords[1] < 0) || (coords[1] > $(CANVAS_ID).height())) {
            mouse.left_button_drag = false;
            mouse.left_button_drawing = false;
            ghost_grid = new Grid(DIMENSIONS, false);
            redraw_all();
        }
    });                
    
    $(CANVAS_ID).mousemove(function(event) {
        var coords = get_coords(event);
        
        var cell_coords = pixel_coords_to_cell_coords(coords);

        // dragging a pattern
        if (mouse.left_button_drag) {
            ghost_grid = new Grid(DIMENSIONS, false);
            put_pattern(ghost_grid, mouse.dragged_pattern, cell_coords);
        }
        // drawing cells
        else if (mouse.left_button_drawing) {
            if (mouse.value_on_down != Cellstate.alive) {
                cell_on(main_grid, cell_coords);
            }
            else if (mouse.value_on_down == Cellstate.alive) {
                cell_off(main_grid, cell_coords);
            };                        
        };
        redraw_all();                    
    });

    // disabling right mouse click on canvas
    $('body').on('contextmenu', CANVAS_ID, function() {
        return false;
    });

    // setting mouse cursors                 
    $('body').mousemove(function(event) {
        if (mouse.left_button_drag) {
            $(this).css('cursor', 'move');
        }
        else {
            $(this).css('cursor', 'default');
        }                    
    });
    
    // BUTTON EVENT HANDLERS
    $("#live").click(function(event) {
        var rounds = $("#form1").val();

        function one_round() {
            if (round_nr >= (rounds - 1)) {
                clearInterval(board.inter1);
                board.is_running = false;
            };

            // simulate next generation
            next_generation();

            // redraw canvas
            redraw_all();                        

            // increment round number
            round_nr++;
        };

        if ((rounds > 0) && !board.is_running) {
            board.is_running = true;
            var round_nr = 0;

            if (rounds == 1) {
                board.inter1 = setInterval(one_round, 0);
            }
            else {
                board.inter1 = setInterval(one_round, board.delay);
            };
        };
    });

    $("#stop").click(function(event) {
        clearInterval(board.inter1);
        board.is_running = false;
    });

    $("#reset").click(function(event) {
        clearInterval(board.inter1);
        main_grid = new Grid(DIMENSIONS, Cellstate.dead);                    

        board.is_running = false;
        redraw_all();
    }); 

    $("#form_delay").change(function(){
        var value = $("#form_delay").val();
        if (value >= 0) {
            board.delay = value
        };                    
    });

    $("#pattern-pulsar").mousedown(function(event) {
        if (event.which === 1) {
            var pattern = [[0, -2], [0, 2],
                           [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2],
                           [2, -2], [2, -1], [2, 0], [2, 1], [2, 2]]
        
            mouse.dragged_pattern = pattern;
            mouse.left_button_drag = true;
        }                    
    });

    $("#pattern-glider").mousedown(function() {
        var pattern = [[-1, 0], [0, -1], [1, -1], [1, 0], [1, 1]];
        
        mouse.dragged_pattern = pattern;
        mouse.left_button_drag = true;
    });

    $("#pattern-glider-gun").mousedown(function() {
        var pattern = [[-19, -15], [-19, -14], [-18, -15],
                       [-18, -14], [-9, -15], [-9, -14], 
                       [-9, -13], [-8, -16], [-8, -12], 
                       [-7, -17], [-7, -11], [-6, -17], 
                       [-6, -11], [-5, -14], [-4, -16], 
                       [-4, -12], [-3, -15], [-3, -14], 
                       [-3, -13], [-2, -14], [1, -17], 
                       [1, -16], [1, -15], [2, -17], 
                       [2, -16], [2, -15], [3, -18], 
                       [3, -14], [5, -19], [5, -18], 
                       [5, -14], [5, -13], [15, -17], 
                       [15, -16], [16, -17], [16, -16], 
                       [15, 2], [15, 3], [15, 5], 
                       [16, 2], [16, 3], [16, 5], 
                       [16, 6], [16, 7], [17, 8], 
                       [18, 2], [18, 3], [18, 5], 
                       [18, 6], [18, 7], [19, 3], 
                       [19, 5], [20, 3], [20, 5], 
                       [21, 4]];
        
        mouse.dragged_pattern = pattern;
        mouse.left_button_drag = true;
    });
    
    $("#pattern-r-pentomino").mousedown(function() {
        var pattern = [[0, 0], [1, -1], [0, -1], [-1, 0], [0, 1]];
        
        mouse.dragged_pattern = pattern;
        mouse.left_button_drag = true;
    });

    // on window resize
    $(window).resize(function() {
        redraw_all();
    });

    // HELPER FUNCTIONS

    // translates canvas click coords to coords of grid
    function pixel_coords_to_cell_coords(coords) {                
        return [Math.floor(coords[0] / board.cell_size[0]),
                Math.floor(coords[1] / board.cell_size[1])];                     
    };

    // returns event coords relative to canvas
    function get_coords(event) {
        return [(event.clientX - ($(CANVAS_ID)).offset().left),
                (event.clientY - ($(CANVAS_ID)).offset().top)];
    };           

    // function drawing real (living, dying or dead) and ghost cells
    // on canvas and updating living cells counter
    function redraw_all() {
        var canvas = $(CANVAS_ID);
        var context = canvas[0].getContext("2d");

        var width = $(window).width() - 600;
        var height = $(window).height() - 50;

        var cells_alive = 0;                

        resize_canvas(canvas, width, height);
        
        for (var x = 0; x < DIMENSIONS[0]; x++) {
            for (var y = 0; y < DIMENSIONS[1]; y++) {                        
                // drawing cells
                // --alive
                if (main_grid.contents[x][y] == Cellstate.alive) {
                    var fill_style = "#FFFFFF";
                    cells_alive++;
                }
                // --dying
                else if (main_grid.contents[x][y] == Cellstate.dying) {
                    var fill_style = "#6C5EB5";
                }                        
                // --dead
                else {  // if (main_grid.contents[x][y] == Cellstate.dead)
                    var fill_style = "#352879";
                };
            
                // draws a real cell (living, dying or dead)
                draw_a_cell(context, x, y, fill_style);

                // draws a drag&drop ghost-cell on top of the real ones
                if (ghost_grid.contents[x][y]) {
                    // draw the cell itself
                    var fill_style = "rgba(0, 0, 0, 0.6)";
                    draw_a_cell(context, x, y, fill_style);

                    // draw cell's border
                    var line_width = 1;
                    var stroke_style = "#000000";
                    draw_cells_border(context, x, y, line_width, stroke_style);
                };
            };
        };

        // updating cell counter
        $("#counter").html(cells_alive);
    };

    // draws a cell on canvas
    function draw_a_cell(context, x, y, fill_style) {
        context.fillStyle = fill_style;

        context.fillRect(x * board.cell_size[0] + board.margin[0] / 2,
                         y * board.cell_size[1] + board.margin[1] / 2,
                         board.cell_size[0] - board.margin[0],
                         board.cell_size[1] - board.margin[1]);
    };

    // draws border of a cell
    function draw_cells_border(context, x, y, line_width, stroke_style) {
        context.lineWidth = line_width;
        context.strokeStyle = stroke_style;
        context.strokeRect(x * board.cell_size[0] + board.margin[0] / 2,
                           y * board.cell_size[1] + board.margin[1] / 2,
                           board.cell_size[0] - board.margin[0],
                           board.cell_size[1] - board.margin[1]);
    };

    function resize_canvas(canvas, width, height) {
        canvas.attr("width", width);
        canvas.attr("height", height);
        
        board.cell_size = [(width / DIMENSIONS[0]), 
                     (height / DIMENSIONS[1])];
        board.margin = [board.cell_size[0] / MARGIN_RATIO, board.cell_size[1] / MARGIN_RATIO];
    };

});