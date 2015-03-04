# spx-drag-drop

Yet another set of HTML5 drag & drop directives for AngularJS.

**WARNING: Experimental first version! "Works-for-me / YMMV"**

Written partly because I needed to better understand how some aspects of AngularJS worked, but mostly because the existing set of components I found didn't work as I wanted them to (so what else is new..).

Inspired by "[angular-draganddrop](https://github.com/neoziro/angular-draganddrop)" by Greg Bergé .. which did some, but not all the things I wanted to do.

May contain traces of nuts.

### Features

So what's so special about this? Well probably nothing much, but:

Drag:

* Supports dragging multiple types of data
* Can invoke custom function before dragging to modify / set drag parameters

Drop:  

* Supports dropping multiple types of data
* Workaround for missing modifier keys (copy, move, link) in Chrome

Both:

* Works in Firefox and Chrome (only ones tested)
* No jQuery dependencies

## Use

1. Include Angular's JS files (duh)
2. Include the script file
`<script type="text/javascript" src="bower_components/spx-drag-drop/src/spx-drag-drop.js"></script>`
3. Add this script to your Angular app's dependencies:  
`angular.module('yourApp', [ 'spxDragDrop' ])`
4. Sprinkle HTML with `spx-drag` and `spx-drop` and write event handlers.
5. Wow. Such drag. Very drop.

## spx-drag

A directive to make something draggable.

### Example

```html
<div
  spx-drag
  spx-drag-begin="dragBegin($event, $dragData)"
  spx-drag-end="dragEnd($event)"
  spx-drag-class="'dragging'"
  spx-drag-effect="'copyMove'"
  spx-drag-data="{ 'json/my-data': { foo: '1', bar: someScopedValue }, 'text/plain': 'Hello, there', 'text/uri-list': 'http://example.org/' }"
  spx-drop-type="['json/my-data', 'text/uri-list', 'text/plain']"
  >drag me</div>
```

### Attributes

#### spx-drag

boolean: (true)

Set to `false` to disable, anything else enables dragging.

#### spx-drag-begin

*function*: (null)

A function that will be called when a drag operation is about to start.

There are two values bound to the scope when the function is invoked:

* `$event`: the original drag & drop event as passed to the `dragstart` event listener
* `$dragData`: an object with the current drag data

The function can return either:

* `true`: accept `$dragData` as-is and start the drag operation
* a modified `$dragData` object to be used instead
* anything not `true` or an object: cancel the drag operation

`$dragData` will have the following properties set:

* `data`: the evaluated `spx-drag-data` attribute
* `effect`: the evaluated `spx-drag-effect` attribute

If not specified, the drag operation will be processed without this "filtering".

#### spx-drag-end

*function*: (null)

A function that will be called when the drag operation ends.

There are one value bound to the scope when the function is invoked:

* `$event`: the original drag & drop event as passed to the `dragend` event listener

#### spx-drag-class

*css class name*: ("")

An optional CSS class to add to the element when it is being dragged. Will be removed when the drag operation ends.

### spx-drag-effect

*enum*: ("uninitialized")

Corresponds to the [dataTransfer.effectAllowed](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#effectAllowed.28.29), i.e. specifies allowed drag operations (e.g. "copy", "copyMove", etc)

### spx-drag-data

*object*: {}

A set of drag & drop data objects, with the key specifying the data type, and the value specifying the data.

Any data types matching `json/*`, `application/json` or `application/*+json` will be JSON encoded. All other types are `.toString()`'ed (apart from `null` which turns into a blank string)

## spx-drop

A directive to make something accept dropped items.

### Example

```html
<div
  spx-drop
  spx-drop-over="dropOver($event, $dropData)"
  spx-drop-drop="dropDrop($event, $dropData)"
  spx-drop-class="'drop-accept'"
  spx-drop-type="['json/my-data', 'text/uri-list', 'text/plain']"
  >drop somethhing here</div> 
```

### Attributes

#### spx-drop

*boolean* (true)

The main directive attribute. Unless set to `false` it will enable the drop functionality.

#### spx-drop-over

*function* (null)

A function that will be called when an item is being dragged over the element.

There are two values bound to the scope when the function is invoked:

* `$event`: the original drag & drop event as passed to the `dragenter` event listener
* `$dropData`: an object with the current drop data

The function can return either:

* `true`: accept `$dropData` as-is and accept the drop possibility
* a modified `$dropData` object to be used instead
* anything not `true` or an object: reject the drop possibility

`$dropData` will have the following properties set:

* `acceptedTypes`: the evaluated `spx-drop-type` attribute (an array)
* `effect`: the evaluated `spx-drop-effect` attribute
* `className`: the evaluated `spx-drop-class` attribute
* `accept`: the pre-determined accept/reject state (boolean). Set to `true` to force-accept. 

If not specified, the drop possibility will be accepted or rejected as per the specified attributes vs the dropped content. 

#### spx-drop-drop

*function* (null)

A function that will be called when an item is dropped onto the element.

There are two values bound to the scope when the function is invoked:

* `$event`: the original drag & drop event as passed to the `drop` event listener
* `$dropData`: an object with the current drop data

`$dropData` will have the following properties set:

* `effect`: the evaluated `spx-drop-effect` attribute
* `items`: an object with keys/values being what matched the allowed data types. Any data types (keys) matching `json/*`, `application/json` or `application/*+json` will be JSON parsed. (The data is of course also available unprocessed in the $event.dataTransfer object's properties)

#### spx-drop-class

*CSS class name* (null)

An optional CSS class to set on the element if a drop operation is acceptable (i.e. matches drop effect, types, or via the `spx-drop-over` function)

#### spx-drop-effect

*enum* (`"uninitialized"`)

Corresponds to the [dataTransfer.effectAllowed](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#effectAllowed.28.29), i.e. specifies allowed drop operations (e.g. "copy", "copyMove", etc)

#### spx-drop-type

*array of strings* (`[]`)

A list of drop types to accept. Can either be an array of strings, or a comma separated list of strings.

#### spx-drag-reject-files

*boolean* (false)

Most browsers seem to think that if you are dragging some file into the browser and no drag & drop handlers accept it, you want to open the file in the browser. I find this a bit inconsistent.. Set this value to `true` to just fake-accept the dropped file without invoking the `spx-drop-drop` function.

### Additional attributes

For some reason, Chrome does not properly support keyboard modifiers to change the drop operation - the `dropEffect` property is always `'none'`. Firefox corrently deals with these, changing it into "copy" if you hold down *ctrl*, "link" if you hold down *alt*, and otherwise defaults to "move".

As a work-around for this issue, 2 additional attributes exist, which does not normally have to be set as they have sensible defaults, but customizability is great, so here we go:

#### spx-drop-effect-modifier-keys

*object* (`{ 'c': 'copy', 'a': 'link', 's': 'move' }`)

This object defines the outcome of the combination of using modifier keys such as *ctrl*, *alt* and *shift*. If *ctrl* and *alt* are pressed, the `'ca'` property is checked. If *alt* is pressed, the `'a'` property is checked, and if *ctrl*, *alt* and *shift* are pressed, the `'cas'` property is pressed, and so on.

`'c'` for *ctrl* is always first, followed by `'a'` for *alt*, then `'s'` for *shift*. `''` means no modifier keys are pressed.

Values have to be either `'copy'`, `'link'`, `'move'` or `'none'`.
 

#### spx-drop-effect-default-priority

*array of strings* (`["move", "copy", "link"]`)

This specifies the priority to default to checking if allowed if no modifiers are used and could be matched (i.e. against `spx-drop-effect-modifier-keys`).

## Practical example

*To-do...*

## License

License: MIT

I guess.
