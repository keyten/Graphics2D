extend(Path.prototype, {

    smooth: function(options){
        if(!options){
            options = {};
        }

        if(options.type === 'asymmetric' || !options.type){
            ;
        }
    },

    simplify: function(options){},

    flatten: function(){}

});