var results = require( "./font-families-results.json" ),
	operatingSystems = {},
	shortCodes = {},
	lookupTable = {};

results.families.forEach(function( family, osId ) {
	operatingSystems[ osId ] = {
		name: family.os,
		version: family.version,
		shortcode: family.shortcode
	};

	if( family.aliases[ "" ] ) {
		if( !lookupTable[ "" ] ) {
			lookupTable[ "" ] = {};
		}

		lookupTable[ "" ][ osId ] = {
			fallback: true,
			alias: family.aliases[ "" ],
			fontFamily: familyName
		};
	}

	family.families.forEach(function( familyName ) {
		var normalizedFamilyName = familyName.toLowerCase();

		if( !lookupTable[ normalizedFamilyName ] ) {
			lookupTable[ normalizedFamilyName ] = {};
		}

		lookupTable[ normalizedFamilyName ][ osId ] = {
			fallback: false,
			alias: family.aliases[ normalizedFamilyName ],
			fontFamily: familyName
		};
	});
});

var FFRLookup = function( familyList ) {
	this.familyList = familyList;
	this.stack = this.normalizeStack( familyList );
	this.support = this.fetchSupport();
};

FFRLookup.prototype.normalizeStack = function() {
	return this.familyList.split( ',' ).map(function( familyName ) {
		return familyName.trim().toLowerCase();
	});
};

FFRLookup.prototype.fetchSupport = function() {
	var support = {};

	this.stack.forEach(function( familyName, index ) {
		var supportedFamily;
		for( var osId in operatingSystems ) {
			supportedFamily = lookupTable[ familyName ][ osId ];
			if( !support[ osId ] && supportedFamily ) {
				// console.log( 'match ', supportedFamily, ' on ', operatingSystems[ osId ] );
				support[ osId ] = supportedFamily;
			} else if( !supportedFamily ) {
				support[ osId ] = undefined;
				// console.log( 'did not match ', familyName, ' on ', operatingSystems[ osId ] );
			}
		}
	});

	return support;
};

FFRLookup.prototype.toJSON = function() {
	/* 
	{
		"times new roman": [
			{
				"support": true,
				"alias": false,
				"unsupported": false,
				"fallback": false,
				"shortcode": "win8",
				"name": "Windows 8",
				"fontFamily": "Times New Roman"
			}
		]
	}
	*/
	var arr = [],
		json = {},
		os;
	
	for( var osId in this.support ) {
		os = operatingSystems[ osId ];
		arr.push({
			support: !!( this.support[ osId ] && !this.support[ osId ].alias ),
			alias: !!( this.support[ osId ] && this.support[ osId ].alias ),
			unsupported: !this.support[ osId ],
			fallback: !!( this.support[ osId ] && this.support[ osId ].fallback ),
			shortcode: os.shortcode,
			name: os.name,
			version: os.version,
			fontFamily: this.support[ osId ] ? ( this.support[ osId ].alias || this.support[ osId ].fontFamily ) : ""
		});
	}

	return arr;
};

FFRLookup.prototype.toString = function() {
	var str = [ "\nfont-family: " + this.familyList + ";\n" ];
	for( var osId in this.support ) {
		str.push( operatingSystems[ osId ] + ': ' + ( this.support[ osId ] ? ( this.support[ osId ].alias || this.support[ osId ].fontFamily ) : "(fallback)" ) );
	}
	return str.join( "\n" );
};

// http://code.activestate.com/recipes/577787-slugify-make-a-string-usable-in-a-url-or-filename/
FFRLookup.prototype.getFileName = function() {
	var s = this.familyList;
  s = s.replace( /[^\w\s-]/g, '').trim().toLowerCase();
  s = s.replace( /[-\s]+/g , '-');
  return s;
};

FFRLookup.prototype.getFilePath = function() {
	var filename = this.getFileName();

	if( filename === "" ) {
		return "../fontfamily.io/defaults/default.html";
	}

	return "../fontfamily.io/results/" + filename + ".html";
};

var db,
	ejs = require('ejs'),
	fs = require('fs'),
	template = fs.readFileSync( "./result.ejs", 'utf8' ),
	str;

for( var familyName in lookupTable ) {
	db = new FFRLookup( familyName );
	str = ejs.render( template, {
		slug: db.getFileName(),
		operatingSystems: db.toJSON()
	});

	fs.writeFile( db.getFilePath(), str, function( error ) {
		if( error ) {
			console.log( 'template error: ', error );
		} else {
			console.log( "template success." );
		}
	});
}

// var db = new FFRLookup( "Times" );

// console.log( db.toString(), "\n" );
// console.log( db.toJSON(), "\n" );