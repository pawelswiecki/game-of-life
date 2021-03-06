var DIMENSIONS = [115, 80];
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
board.inter1; // interval
board.is_running = false;
board.context = null; // $(CANVAS_ID)[0].getContext("2d");
board.cells_alive = 0;
board.round_nr = 0;

var mouse = {};
mouse.left_button_drawing = false;            
mouse.value_on_down = Cellstate.dead;            
mouse.left_button_drag = false;
mouse.dragged_pattern = [];

// array with historical data about # of living cells
var histogram = {};
histogram.data1 = null;
histogram.context = null; // $("#histogram")[0].getContext("2d");
histogram.heightof = 0;
histogram.widthof = 0;
histogram.max = 0;


// **************************************************************************
// ******************************** FRONT-END *******************************
// **************************************************************************

$(document).ready(function() {
    board.context = $(CANVAS_ID)[0].getContext("2d");

    // setting up histogram    
    histogram.context = $("#histogram")[0].getContext("2d");
    histogram.widthof = $('#histogram').width();
    histogram.heightof = $('#histogram').height();
    histogram.max = histogram.heightof;
    histogram.data1 = populate_fixedqueue(size=histogram.widthof, value=0);    
    
    $('#divcanv1').show();

    redraw_all();
    
    // HANDLERS
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

    // redraws all on activate (strange issue with resizing and scrollbar)
    $(window).focus(function(){
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
    $("#start-stop").click(function(event) {
        if (board.is_running) {            
            make_it_stop();
        }
        else {
            make_it_start(); 
        };
    });

    $("#step").click(function(event) {        
        if (!board.is_running) {
            one_round();        
        };
        make_it_stop();
    });

    $("#reset").click(function(event) {
        make_it_stop();

        main_grid = new Grid(DIMENSIONS, Cellstate.dead);                            
        histogram.data1 = populate_fixedqueue(size=histogram.widthof, value=0);
        histogram.max = histogram.heightof;
        board.round_nr = 0;

        redraw_all();
    });     

    $("#pattern-pulsar").mousedown(function(event) {
        if (event.which === 1) {        
            mouse.dragged_pattern = patterns["pulsar"];
            mouse.left_button_drag = true;
        }                    
    });

    $("#pattern-glider").mousedown(function() {        
        mouse.dragged_pattern = patterns["glider"];
        mouse.left_button_drag = true;
    });

    $("#pattern-glider-gun").mousedown(function() {
        mouse.dragged_pattern = patterns["glider-gun"];
        mouse.left_button_drag = true;
    });
    
    $("#pattern-r-pentomino").mousedown(function() {        
        mouse.dragged_pattern = patterns["r-pentomino"];
        mouse.left_button_drag = true;
    });

    $("#pattern-LWSS").mousedown(function() {        
        mouse.dragged_pattern = patterns["LWSS"];
        mouse.left_button_drag = true;
    });


    // on window resize
    $(window).resize(function() {
        // calling it twice so scrollbar won't affect resizing
        redraw_all();
        redraw_all();
    });

    // HELPER FUNCTIONS

    // executes one round of the simulation
    function one_round() {
        // simulate next generation
        next_generation();

        // increment round number
        board.round_nr++;

        // redraw canvas
        redraw_all();
    };

    function make_it_stop() {
        clearInterval(board.inter1);
        board.is_running = false;
        $("#start-stop").attr('value', ' go ');
    };

    function make_it_start() {
        board.is_running = true;
        board.inter1 = setInterval(one_round, 0);
        $("#start-stop").attr('value', 'stop');
    };

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
    // on canvas and calling update_counters_and_histogram()
    function redraw_all() {
        var canvas = $(CANVAS_ID);        

        var width = $(window).width() - 580;
        var height = $(window).height() - 27;

        board.cells_alive = 0;

        resize_canvas(canvas, width, height);
        
        for (var x = 0; x < DIMENSIONS[0]; x++) {
            for (var y = 0; y < DIMENSIONS[1]; y++) {                        
                // drawing cells
                // --alive
                if (main_grid.contents[x][y] == Cellstate.alive) {
                    var fill_style = "#FFFFFF";
                    board.cells_alive++;
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
                draw_a_cell(board.context, x, y, fill_style);

                // draws a drag&drop ghost-cell on top of the real ones
                if (ghost_grid.contents[x][y]) {
                    // draw the cell itself
                    var fill_style = "rgba(0, 0, 0, 0.6)";
                    draw_a_cell(board.context, x, y, fill_style);

                    // draw cell's border
                    var line_width = 1;
                    var stroke_style = "#000000";
                    draw_cells_border(board.context, x, y, line_width, stroke_style);
                };
            };
        };

        // updating cell counter
        update_counters_and_histogram();
    };

    function update_counters_and_histogram() {
        $("#counter").html(board.cells_alive);

        histogram.context.fillStyle = "#352879";
        histogram.context.fillRect(0, 0, histogram.widthof, histogram.heightof);

        histogram.context.fillStyle = "#6C5EB5";
        
        for (var i = 0; i < histogram.widthof; i++) {
            if (histogram.data1[i] > histogram.max) {
                histogram.max = histogram.data1[i]
            }            
            histogram.context.fillRect(i, histogram.heightof,
                                       1, -histogram.data1[i] * 
                                       (histogram.heightof / (histogram.max)));
        };

        $("#generations").html(board.round_nr);
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
        board.margin = [board.cell_size[0] / MARGIN_RATIO,
                        board.cell_size[1] / MARGIN_RATIO];
    };

    function populate_fixedqueue(size, value) {
        ret = FixedQueue(size=size, initialValues=[]);
        for (var x = 0; x < size; x++) {
            ret.push(value);
        };
        return ret;
    };
});