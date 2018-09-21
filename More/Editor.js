/* Interface:
 - rect.editor('transform');
 - rect.editor('transform', command); // <- command = enable / disable / rotate / freeze / destroy / etc
 - rect.editor('transform', properties); // sets attrs
 */
extend(Drawable.prototype, {
	editor: function(kind, value, params){
		if(!value){
			value = 'enable';
		}

		if(!Delta.editors[kind]){
			throw 'There\'s no ' + kind + ' editor';
		}

		if(value + '' === value){
			return Delta.editors[kind][value](this, params) || this;
		}
	}
});

Delta.editors = {};
