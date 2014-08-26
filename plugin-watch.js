/*:
	@module-license:
		The MIT License (MIT)

		Copyright (c) 2014 Richeve Siodina Bebedor

		Permission is hereby granted, free of charge, to any person obtaining a copy
		of this software and associated documentation files (the "Software"), to deal
		in the Software without restriction, including without limitation the rights
		to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		copies of the Software, and to permit persons to whom the Software is
		furnished to do so, subject to the following conditions:

		The above copyright notice and this permission notice shall be included in all
		copies or substantial portions of the Software.

		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		SOFTWARE.
	@end-module-license

	@module-configuration:
		{
			"packageName": "plugin-watch",
			"fileName": "plugin-watch.js",
			"moduleType": "plugin",
			"authorName": "Richeve S. Bebedor",
			"authorEMail": "richeve.bebedor@gmail.com",
			"repository": "git@github.com:volkovasystems/plugin-watch.git",
			"isGlobal": "true"
		}
	@end-module-configuration

	@module-documentation:

	@end-module-documentation

	@plugin-configuration:
		{
			"pluginName": "watch",
			"pluginTypeList": [
				"polyfill",
				"support",
				"backward-compatibility"
			],
			"pluginAttachmentSet": {
				"Object.prototype": "watch",
				"window": "watchFactory"
			},
			"pluginOverride": "Object.prototype.watch"
		}
	@end-plugin-configuration
*/
( function module( ){
	if( !Object.prototype.watch ){
		var getterFactory = function getterFactory( self, property, valueHistoryStack ){
			var get = function get( ){
				return valueHistoryStack.reverse( )[ 0 ];
			};

			Object.defineProperty( get, "watcherID", {
				"configurable": false,
				"writable": false,
				"enumerable": false,
				"value": self.watcherID
			} );

			return get;
		};

		var setterFactory = function setterFactory( self, property, propertyHandlerList, valueHistoryStack ){
			var set = function set( value ){
				valueHistoryStack.push( value );

				var propertyHandler = null;
				var previousValue = undefined;

				var propertyHandlerListLength = propertyHandlerList.length;
				for( var index = 0; index < propertyHandlerListLength; index++ ){
					propertyHandler = propertyHandlerList[ index ];
					previousValue = valueHistoryStack.reverse( )[ 1 ];
					propertyHandler.call( self, value, previousValue );
				}
			};

			Object.defineProperty( set, "watcherID", {
				"configurable": false,
				"writable": false,
				"enumerable": false,
				"value": self.watcherID
			} );

			return set;
		};

		var generateWatcherID = function generateWatcherID( ){
			return btoa( Math.round( Date.now( ) + Math.random( ) * Date.now( ) ).toString( ) ).toString( ).replace( /[^A-Ba-b0-9]/g, "" );
		};

		var watchFactory = watchFactory || function watchFactory( ){

			var watch = function watch( propertyName, propertyHandler ){

				var self = this;

				//: Extract the property value for enumerable and non enumerable properties.
				var propertyValue;
				if( propertyName in self ||
					typeof self[ propertyName ] != "undefined" )
				{
					propertyValue = self[ propertyName ];
				}

				//: Generate or extract the watcher id.
				var watcherID = self.watcherID;
				if( typeof watcherID != "string" ){
					Object.defineProperty( self, "watcherID", {
						"configurable": false,
						"writable": false,
						"enumerable": false,
						"value": generateWatcherID( )
					} );

					watcherID = self.watcherID;
				}

				//: Create a watcher set for all the watchers.
				watchFactory.watcherSet = watchFactory.watcherSet || { };
				var watcherSet = watchFactory.watcherSet;

				/*:
					Combine the property name and watcher ID to create the watcher namespace.
					Watcher namespace is per object per property.
				*/
				var watcherNamespace = [ watcherID, propertyName ].join( ":" );

				//: Construct watcher data or extract the previous watcher data.
				var watcherData = watcherSet[ watcherNamespace ];
				if( typeof watcherData != "object" ){
					Object.defineProperty( watcherSet, watcherNamespace, {
						"configurable": false,
						"writable": false,
						"enumerable": false,
						"value": {
							"propertyHandlerList": [ ],
							"valueHistoryStack": [ ]
						}
					} );

					watcherData = watcherSet[ watcherNamespace ];
				}

				var propertyHandlerList = watcherData.propertyHandlerList;
				var valueHistoryStack = watcherData.valueHistoryStack;

				//: Push property handler if it is not the same with other property handlers.
				var propertyHandlerListLength = propertyHandlerList.length;
				var index = 0;
				while(
					index < propertyHandlerListLength &&
					propertyHandlerList[ index ].toString( ) != propertyHandler.toString( ) &&
					propertyHandlerList[ index ] != propertyHandler
				);
				if( index >= propertyHandlerListLength ){
					propertyHandlerList.push( propertyHandler );
				}

				//: Push the property value if it is not the same with other property value.
				var valueHistoryStackSize = valueHistoryStack.length;
				index = 0;
				while(
					index < valueHistoryStackSize &&
					valueHistoryStack[ index ] != propertyValue
				);
				if( index >= valueHistoryStackSize ){
					valueHistoryStack.push( propertyValue );
				}

				//: We will use the property descriptor as a template.
				var propertyDescriptorSet = Object.getOwnPropertyDescriptor( self, propertyName );
				/*:
					Set a default property descriptor set.

					NOTE: I set configurable to true so that the developers may have ability to remove the watch.

					NOTE: I removed writable because the presence of get and set has issues when writable is present.
				*/
				propertyDescriptorSet = propertyDescriptorSet || {
					"value": null,
					"get": { },
					"set": { },
					"enumerable": true,
					"configurable": true
				};

				//: But remove the value.
				delete propertyDescriptorSet.value;

				//: Retrieve the previous getter and setter if there are.
				var previousGetter = propertyDescriptorSet.get;
				var previousSetter = propertyDescriptorSet.set;

				//: And delete them if there are.
				if( typeof previousGetter == "function" &&
					typeof previousSetter == "function" )
				{
					delete propertyDescriptorSet.get;
					delete propertyDescriptorSet.set;
				}

				if( !( "watcherID" in previousGetter &&
					"watcherID" in previousSetter ) )
				{
					var getter = getterFactory( self, propertyName, valueHistoryStack );
					var setter = setterFactory( self, propertyName, propertyHandlerList, valueHistoryStack );

					var watcherGetter = getter;
					if( typeof previousGetter == "function" ){
						watcherGetter = function get( ){
							var previousGetterValue = previousGetter.call( self );
							var getterValue = getter.call( self );

							if( previousGetterValue === getterValue ){
								return previousGetterValue;

							}else{
								return getterValue;
							}
						};
					}

					var watcherSetter = setter;
					if( typeof previousSetter == "function" ){
						watcherSetter = function set( value ){
							previousSetter.call( self, value );
							setter.call( self, value );
						};
					}

					propertyDescriptorSet.get = watcherGetter;
					propertyDescriptorSet.set = watcherSetter;

					Object.defineProperty( self, propertyName, propertyDescriptorSet );
				}
			}

			return watch;
		};
		window.watchFactory = watchFactory;

		Object.defineProperty( Object.prototype, "watch", {
			"enumerable": false,
			"configurable": false,
			"writable": false,
			"value": watchFactory( )
		} );
	}
} )( );