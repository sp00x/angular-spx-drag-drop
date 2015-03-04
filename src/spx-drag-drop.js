/*! spxDragDrop v0.1.1 // (c) 2015 Rune Bjerke // License MIT */

(function()
{
    angular
        .module('spxDragDrop', [])
        .directive('spxDrag', ['$parse', spxDragDirectiveUnscoped])
        .directive('spxDrag2', ['$parse', spxDragDirectiveScoped])
        .directive('spxDrop', ['$parse', spxDropDirectiveUnscoped])
        .directive('spxDrop2', ['$parse', spxDropDirectiveScoped]);

    var effectAllowedTable =
    {
        copy: { copy: true, move: false, link: false },
        link: { copy: false, move: false, link: false },
        move: { copy: false, move: true, link: false },
        copyLink: { copy: true, move: false, link: true },
        copyMove: { copy: true, move: true, link: false },
        linkMove: { copy: false, move: true, link: false },
        none: { copy: false, move: false, link: false },
        all: { copy: true, move: true, link: true },
        uninitialized: { copy: undefined, move: undefined, link: undefined }
    };

    var log = {
        debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn ? console.warn.bind(console) : console.error.bind(console),
        error: console.error.bind(console),
        group: console.group.bind(console),
        groupEnd: console.groupEnd.bind(console)
    };

    function nullFunc() {}

    // disable logging
    log = { log: nullFunc, debug: nullFunc, info: nullFunc, warn: nullFunc, error: nullFunc, group: nullFunc, groupEnd: nullFunc };

    function toArray(notArray)
    {
        if (notArray == null) return notArray; // null || undefined
        var array = [];
        if (typeof notArray.length == 'number')
        {
            for (var i=0; notArray.length>i; i++)
                array.push(notArray[i]);
        }
        return array;
    }

    /**
     * An abstraction of the scoped/unscoped implementations.
     */
    var dragLink = function (useIsolatedScope, $parse, scope, elem, attrs)
    {
        function ev(value, type)
        {
            if (type == 'function')
            {
                // I DON'T FULLY UNDERSTAND WHY, BUT..
                //
                // just make it easier when calling these methods as if we
                // are calling via an isolated scope it would be
                //   func({ $event: ..})
                // where as if calling via the $parse output we need to do
                //   func(scope, { $event: ..})

                if (value == null || value != "")
                {
                    var func = $parse(value);
                    return func.bind(this, scope);
                }
                else
                    return undefined;
            }
            else
            {
                return scope.$eval(value);
            }
        }

        var domElem = elem[0];

        var drag = null,
            dragBeginHandler = null,
            dragEndHandler = null,
            dragClass = null,
            dragEffect = null;

        if (useIsolatedScope)
        {
            drag = scope.spxDrag !== false;
            dragBeginHandler = scope.spxDragBegin;
            dragEndHandler = scope.spxDragEnd;
        }
        else
        {
            drag = ev(attrs.spxDrag) !== false;
            dragBeginHandler = ev(attrs.spxDragBegin, 'function');
            dragEndHandler = ev(attrs.spxDragEnd, 'function');
        }

        //console.log("spx-drag bf=%o ef=%o c=%o d=%o t=%o e=%o", dragBeginHandler != null, dragEndHandler != null, dragClass, dragData, dragType, dragEffect);
        //console.log(scope);

        domElem.draggable = drag;
        if (!drag) return;

        function dragStartListener(e)
        {
            if (DEBUG) log.group();
            try
            {
                if (DEBUG) log.log("spx-drag dragstart", e);

                // re-read stuff
                dragEffect = (useIsolatedScope) ? scope.spxDragEffect : scope.$eval(attrs.spxDragEffect);

                // evaluate data (if any)
                var data = useIsolatedScope ? scope.spxDragData : ev(attrs.spxDragData);

                if (DEBUG) log.info("spx-drag data=%o, e=%o", data, dragEffect);

                // if a drag-begin handler is listed, call it
                if (dragBeginHandler)
                {
                    if (DEBUG) log.info("spx-data dispatching to drag-begin handler..");
                    scope.$apply(function ()
                    {
                        var ret = dragBeginHandler({
                            $event: e,
                            $dragData: { data: data, effect: dragEffect}
                        });
                        if (DEBUG) log.info("spx-data drag-begin handler returned:", ret);
                        if (ret != null && typeof ret == 'object')
                        {
                            if (ret.data) data = ret.data;
                            if (ret.effect) dragEffect = ret.effect;
                        }
                        else
                        {
                            if (ret !== true) data = null; // cancel it
                        }
                    });
                }

                // if we still have data (even after the drag-begin handler, start the drag operation
                if (data != null)
                {
                    e.dataTransfer.effectAllowed = dragEffect || e.dataTransfer.effectAllowed;

                    // set drag data and type
                    for (var dragType in data)
                    {
                        var dragData = data[dragType];

                        if (dragType.match(/^application\/(.*?\+)?json$/i) || dragType.match(/^json\//i))
                        {
                            // if json/* or application/json or application/*+json
                            var jsonData = angular.toJson(dragData); // avoids $$-prefixed properties
                            if (DEBUG) log.debug("setting json type: %o -> %o", dragType, jsonData);
                            e.dataTransfer.setData(dragType, jsonData);
                        }
                        else
                        {
                            // just set whatever it was, as it was (XXX does this need a .toString() ?)
                            var s;
                            if (dragData == null)
                                s = "";
                            else if (typeof dragData == 'string' || typeof dragData == 'string')
                                s = dragData;
                            else if (typeof dragData == 'object')
                                s = angular.toJson(dragData); // or should we .toString() this also?
                            else
                                s = dragData.toString();

                            if (DEBUG) log.debug("setting string type: %o -> %o", dragType, s);
                            e.dataTransfer.setData(dragType, s);
                        }
                    }

                    // add css class?
                    dragClass = (useIsolatedScope) ? scope.spxDragClass : scope.$eval(attrs.spxDragClass);
                    if (dragClass) elem.addClass(dragClass);

                    if (DEBUG) log.log("spx-drag dragstart accepted drag: d=%o, t=%o, c=%o", data, dragType, dragClass);
                }
                else
                {
                    if (DEBUG) log.log("spx-drag dragstart REJECTED drag");
                }

                // stop event propagation (handled)
                e.stopPropagation();
            }
            finally
            {
                if (DEBUG) log.groupEnd();
            }
        }

        function dragEndListener(e)
        {
            // dragClass was read in dragStartListener
            if (dragClass) elem.removeClass(dragClass);
            dragClass = null;

            // if a drag-end handler is listed, call it
            if (dragEndHandler)
            {
                if (DEBUG) log.log("spx-data dispatching to drag-end handler..");
                scope.$apply(function ()
                {
                    dragEndHandler({$event: e});
                });
            }
        }

        // hook
        domElem.addEventListener('dragstart', dragStartListener);
        domElem.addEventListener('dragend', dragEndListener);

        // unhook on end
        scope.$on('$destroy', function ()
        {
            domElem.removeEventListener('dragstart', dragStartListener);
            domElem.removeEventListener('dragend', dragEndListener);
        });
    };

    /**
     * An abstraction of the scoped/unscoped implementations.
     */
    var dropLink = function (useIsolatedScope, $parse, scope, elem, attrs)
    {
        function ev(value, type)
        {
            if (type == 'function')
            {
                // I DON'T FULLY UNDERSTAND WHY, BUT..
                //
                // just make it easier when calling these methods as if we
                // are calling via an isolated scope it would be
                //   func({ $event: ..})
                // where as if calling via the $parse output we need to do
                //   func(scope, { $event: ..})

                if (value == null || value != "")
                {
                    var func = $parse(value);
                    return func.bind(this, scope);
                }
                else
                    return undefined;
            }
            else
            {
                return scope.$eval(value);
            }
        }

        var domElem = elem[0];

        var drop = useIsolatedScope ? scope.spxDrop : ev(attrs.spxDrop);
        var dropDropHandler = useIsolatedScope ? scope.spxDropDrop : ev(attrs.spxDropDrop, 'function');
        var dropOverHandler = useIsolatedScope ? scope.spxDropOver : ev(attrs.spxDropOver, 'function');
        var dropAcceptedTypes = null;
        var dropClass = null;
        var dropEffect = null;
        var dropRejectFiles = null;
        var dropEffectDefaultPriority = [];
        var dropEffectModifierKeyTable = {};

        if (drop === false) return;

        //if (DEBUG) log.log("spx-drop of=%o df=%o af=%o ac=%o rc=%o e=%o t=%o", dropOverHandler, dropHandler, dropAcceptHandler, dropAcceptClass, dropRejectClass, dropEffect, dropType);

        var currentAccept = false;
        var currentEffectAllowed = 'none';
        var currentRejectFile = false;
        var currentAcceptedTypes = [];

        function monkeyPatchDropEffect(e)
        {
            // Firefox behaves nicely, but in Chrome the e.dataTransfer.dropEffect is always 'none'
            // no matter if ctrl, alt or shift is used..
            if (e.dataTransfer && e.dataTransfer.dropEffect == 'none')
            {
                var allowedDrop = effectAllowedTable[currentEffectAllowed];
                var allowedDrag = effectAllowedTable[e.dataTransfer.effectAllowed];

                var keys = (e.ctrlKey ? "c" : "") + (e.altKey ? "a" : "") + (e.shiftKey ? "s" : "");

                if (DEBUG) log.debug("keys:", keys, e.dataTransfer.effectAllowed);

                // see if what the key combo is trying to do is allowed
                var op = dropEffectModifierKeyTable[keys];
                if (op != null)
                {
                    if (DEBUG) log.debug('desired based on keys is: ' + op);
                    if (allowedDrop[op] === true && allowedDrag[op] === true)
                        e.dataTransfer.dropEffect = op;
                }

                // if the operation wasn't allowed, and the user wasn't doing any modifiers
                // then just pick the first allowed one
                if (e.dataTransfer.dropEffect == "none" && keys == "")
                {
                    if (DEBUG) log.debug("trying defaults..", allowedDrag);
                    for (var i=0; dropEffectDefaultPriority.length>i; i++)
                    {
                        if (allowedDrag[dropEffectDefaultPriority[i]])
                        {
                            if (DEBUG) log.debug("chose default:", dropEffectDefaultPriority[i]);
                            e.dataTransfer.dropEffect = dropEffectDefaultPriority[i];
                            break;
                        }
                    }
                }
                if (DEBUG) log.debug("-> result:", e.dataTransfer.dropEffect);
            }
            return e.dataTransfer.dropEffect;
        }

        function dropListenerEvent(e)
        {
            if (DEBUG) log.log("spx-drop drop", e, e.dataTransfer.types);
            if (dropClass) elem.removeClass(dropClass);

            monkeyPatchDropEffect(e);

            e.preventDefault();
            e.stopPropagation(); // at least according to http://www.tutorialspoint.com/html5/html5_drag_drop.htm

            if (dropDropHandler)
            {
                scope.$apply(function ()
                {
                    if (DEBUG) log.log("invoking drop handler..");
                    var data = {
                        effect: e.dataTransfer.dropEffect,
                        items: {}
                    };
                    currentAcceptedTypes.forEach(function(t)
                    {
                        try
                        {
                            if (t == 'Files')
                                data.items[t] = e.dataTransfer.files;
                            else
                            {
                                if (t.match(/^application\/(.*?\+)?json$/i) || t.match(/^json\//i))
                                    data.items[t] = JSON.parse(e.dataTransfer.getData(t));
                                else
                                    data.items[t] = e.dataTransfer.getData(t);
                            }
                        }
                        catch (e)
                        {
                        }
                    });
                    var res = dropDropHandler({
                        $event: e,
                        $dropData: data
                    });
                    if (DEBUG) log.log("drop handler returned:", res);
                })
            }
        }

        function dragOverListener(e)
        {
            //if (DEBUG) log.log("spx-drop dragover", e, currentAccept);
            if (currentAccept)
            {
                monkeyPatchDropEffect(e);

                if (dropClass && !currentRejectFile) elem.addClass(dropClass);

                // cancel the event to indicate that we accepted it
                e.preventDefault();
                return false;
            }
        }

        function dragEnterListener(e)
        {
            if (DEBUG) log.log("spx-drop dragenter", e.dataTransfer);

            dropEffectDefaultPriority = useIsolatedScope ? scope.spxDropEffectDefaultPriority : ev(attrs.spxDropEffectDefaultPriority);
            dropEffectModifierKeyTable = useIsolatedScope ? scope.spxDropEffectModifierKeys : ev(attrs.spxDropEffectModifierKeys);
            dropEffectDefaultPriority = dropEffectDefaultPriority || [ "move", "copy", "link" ];
            dropEffectModifierKeyTable = dropEffectModifierKeyTable || { 'c': 'copy', 'a': 'link', 's': 'move' };

            var dt = e.dataTransfer;

            if (dt.files && dt.files.length > 0)
                if (DEBUG) log.log(" - files: ", dt.files);

            var dragTypes = {};
            if (dt.types)
            {
                toArray(dt.types).forEach(function(t)
                {
                    dragTypes[t] = true;
                });
                if (DEBUG) log.log(" - dt.types: ", dt.types);
                if (DEBUG) log.log(" - dragTypes: ", dragTypes);
            }

            dropEffect = useIsolatedScope ? scope.spxDropEffect : ev(attrs.spxDropEffect);
            dropRejectFiles = useIsolatedScope ? scope.spxDropRejectFiles : ev(attrs.spxDropRejectFiles);

            currentAcceptedTypes = [];
            var acceptedTypes = [];
            dropAcceptedTypes = useIsolatedScope ? scope.spxDropType : ev(attrs.spxDropType);
            if (typeof dropAcceptedTypes == 'string')
            {
                dropAcceptedTypes.split(',').forEach(function(t)
                {
                    t = t.trim();
                    if (t.length > 0) acceptedTypes.push(t);
                })
            }
            else if (dropAcceptedTypes instanceof Array)
            {
                acceptedTypes = acceptedTypes.concat(dropAcceptedTypes);
            }

            if (DEBUG) log.log("allowed types:", JSON.stringify(acceptedTypes));

            currentAccept = false;

            acceptedTypes.forEach(function(t)
            {
                if (dragTypes[t])
                {
                    if (DEBUG) log.info("pre-accepting drag type:", t);
                    currentAccept = true;
                }
            });

            if (dropOverHandler)
            {
                scope.$apply(function()
                {
                    if (DEBUG) log.log("invoking drop-over handler..");
                    var res = dropOverHandler({ $event: e, $dropData: { acceptedTypes: acceptedTypes, effect: dropEffect, className: dropClass, accept: currentAccept }});
                    if (DEBUG) log.log("drop-over handler returned:", res);

                    if (res != null && typeof res == 'object')
                    {
                        if (res.acceptedTypes) acceptedTypes = res.acceptedTypes;
                        if (res.effect) dropEffect = res.effect;
                        if (res.className) dropClass = res.className;
                        currentAccept = !!res.accept;

                        // re-test in case dropOverHandler modified..
                        acceptedTypes.forEach(function(t)
                        {
                            if (dragTypes[t])
                            {
                                if (DEBUG) log.info("accepting drag type:", t);
                                currentAccept = true;
                            }
                        });
                    }
                    else
                    {
                        if (res === true)
                        {
                            // accept explicitly
                            currentAccept = true;
                        }
                        else// if (res != null) // if we get null/undefined, assume that meant NO!
                        {
                            // reject explicitly
                            currentAccept = false;
                            acceptedTypes = [];
                        }
                    }
                });
            }

            currentRejectFile = false;
            if (!currentAccept && dropRejectFiles && dragTypes['Files'])
            {
                if (DEBUG) log.info("'accepting' rejected file..");
                currentAccept = true;
                currentRejectFile = true;
            }

            if (currentAccept)
            {
                if (DEBUG) log.info("accepting drop!");

                monkeyPatchDropEffect(e);

                currentAcceptedTypes = [];
                acceptedTypes.forEach(function(t)
                {
                    if (dragTypes[t])
                        currentAcceptedTypes.push(t);
                });

                dropClass = null;
                if (currentRejectFile)
                {
                    e.effectAllowed = currentEffectAllowed = 'none';
                }
                else
                {
                    e.effectAllowed = currentEffectAllowed = dropEffect;
                    dropClass = useIsolatedScope ? scope.spxDropClass : ev(attrs.spxDropClass);
                    if (dropClass) elem.addClass(dropClass);
                }

                // cancel the event to indicate that we accepted it
                e.preventDefault();
                return false;
            }
            else
            {
                // do nothing to indicate we did not accept it
                if (DEBUG) log.info("rejecting drop!");
            }
        }

        function dragLeaveListener(e)
        {
            if (dropClass) elem.removeClass(dropClass);
        }

        domElem.addEventListener('drop', dropListenerEvent);
        domElem.addEventListener('dragenter', dragEnterListener);
        domElem.addEventListener('dragover', dragOverListener);
        domElem.addEventListener('dragleave', dragLeaveListener);

        scope.$on('$destroy', function ()
        {
            domElem.removeEventListener('drop', dropListenerEvent);
            domElem.removeEventListener('dragenter', dragEnterListener);
            domElem.removeEventListener('dragover', dragOverListener);
            domElem.removeEventListener('dragleave', dragLeaveListener);
        });
    };


    /**
     * Unscoped spxDrag version.
     *
     * Reads parameters from attributes. Avoids the problem of having both
     * spxDrag and spxDrop on the same component, which would create an
     * isolated scope conflict.
     */
    function spxDragDirectiveUnscoped($parse)
    {
        var $ = {
            restrict: 'A',
            link: dragLink.bind($, false, $parse)
        };
        return $;
    }

    /**
     * Scoped spxDrag2 version.
     *
     * Can't be used on the same container as spxDrop2.
     */
    function spxDragDirectiveScoped($parse)
    {
        var $ = {
            restrict: 'A',
            scope: {
                'spxDrag': '=',
                'spxDragBegin': '&',
                'spxDragEnd': '&',
                'spxDragClass': '@',
                'spxDragEffect': '=',
                'spxDragData': '='
            },
            link: dragLink.bind($, true, $parse)
        };
        return $;
    }

    /**
     * Unscoped spxDrop version
     */
    function spxDropDirectiveUnscoped($parse)
    {
        var $ = {
            restrict: 'A',
            link: dropLink.bind($, false, $parse)
        };
        return $;
    }

    /**
     * Scoped spxDrop2 version
     */
    function spxDropDirectiveScoped($parse)
    {
        var $ = {
            restrict: 'A',
            scope: {
                'spxDrop': '=',
                'spxDropDrop': '&',
                'spxDropOver': '&',
                'spxDropClass': '=',
                'spxDragEffect': '=',
                'spxDropType': '=',
                'spxDropRejectFiles': '=',
                'spxDropEffectDefaultPriority': '=',
                'spxDropEffectModifierKeys': '='
            },
            link: dropLink.bind($, true, $parse)
        };
        return $;
    }

})(); // closure



