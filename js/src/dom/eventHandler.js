import Polyfill from './polyfill'
import Util from '../util'

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.1.1): dom/eventHandler.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

const EventHandler = (() => {
  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  const namespaceRegex = /[^.]*(?=\..*)\.|.*/
  const stripNameRegex = /\..*/
  const keyEventRegex  = /^key/
  const stripUidRegex  = /::\d+$/
  const eventRegistry  = {}   // Events storage
  let uidEvent         = 1
  const customEvents   = {
    mouseenter: 'mouseover',
    mouseleave: 'mouseout'
  }
  const nativeEvents   = [
    'click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu',
    'mousewheel', 'DOMMouseScroll',
    'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend',
    'keydown', 'keypress', 'keyup',
    'orientationchange',
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
    'gesturestart', 'gesturechange', 'gestureend',
    'focus', 'blur', 'change', 'reset', 'select', 'submit', 'focusin', 'focusout',
    'load', 'unload', 'beforeunload', 'resize', 'move', 'DOMContentLoaded', 'readystatechange',
    'error', 'abort', 'scroll'
  ]

  /**
   * ------------------------------------------------------------------------
   * Private methods
   * ------------------------------------------------------------------------
   */

  function getUidEvent(element, uid) {
    return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++
  }

  function getEvent(element) {
    const uid = getUidEvent(element)
    element.uidEvent = uid

    return eventRegistry[uid] = eventRegistry[uid] || {}
  }

  function fixEvent(event, element) {
    // Add which for key events
    if (event.which === null && keyEventRegex.test(event.type)) {
      event.which = event.charCode !== null ? event.charCode : event.keyCode
    }

    event.delegateTarget = element
  }

  function bootstrapHandler(element, fn) {
    return function handler(event) {
      fixEvent(event, element)
      if (handler.oneOff) {
        EventHandler.off(element, event.type, fn)
      }

      return fn.apply(element, [event])
    }
  }

  function bootstrapDelegationHandler(element, selector, fn) {
    return function handler(event) {
      const domElements = element.querySelectorAll(selector)
      for (let target = event.target; target && target !== this; target = target.parentNode) {
        for (let i = domElements.length; i--;) {
          if (domElements[i] === target) {
            fixEvent(event, target)
            if (handler.oneOff) {
              EventHandler.off(element, event.type, fn)
            }

            return fn.apply(target, [event])
          }
        }
      }

      // To please ESLint
      return null
    }
  }

  function findHandler(events, handler, delegationSelector = null) {
    for (const uid in events) {
      if (!Object.prototype.hasOwnProperty.call(events, uid)) {
        continue
      }

      const event = events[uid]
      if (event.originalHandler === handler && event.delegationSelector === delegationSelector) {
        return events[uid]
      }
    }

    return null
  }

  function normalizeParams(originalTypeEvent, handler, delegationFn) {
    const delegation      = typeof handler === 'string'
    const originalHandler = delegation ? delegationFn : handler

    // allow to get the native events from namespaced events ('click.bs.button' --> 'click')
    let typeEvent = originalTypeEvent.replace(stripNameRegex, '')

    const custom = customEvents[typeEvent]
    if (custom) {
      typeEvent = custom
    }

    const isNative = nativeEvents.indexOf(typeEvent) > -1
    if (!isNative) {
      typeEvent = originalTypeEvent
    }

    return [delegation, originalHandler, typeEvent]
  }

  function addHandler(element, originalTypeEvent, handler, delegationFn, oneOff) {
    if (typeof originalTypeEvent !== 'string' || (typeof element === 'undefined' || element === null)) {
      return
    }

    if (!handler) {
      handler = delegationFn
      delegationFn = null
    }

    const [delegation, originalHandler, typeEvent] = normalizeParams(originalTypeEvent, handler, delegationFn)

    const events     = getEvent(element)
    const handlers   = events[typeEvent] || (events[typeEvent] = {})
    const previousFn = findHandler(handlers, originalHandler, delegation ? handler : null)

    if (previousFn) {
      previousFn.oneOff = previousFn.oneOff && oneOff
      return
    }

    const uid = getUidEvent(originalHandler, originalTypeEvent.replace(namespaceRegex, ''))
    const fn  = !delegation ? bootstrapHandler(element, handler) : bootstrapDelegationHandler(element, handler, delegationFn)

    fn.delegationSelector = delegation ? handler : null
    fn.originalHandler = originalHandler
    fn.oneOff = oneOff
    fn.uidEvent = uid
    handlers[uid] = fn

    element.addEventListener(typeEvent, fn, delegation)
  }

  function removeHandler(element, events, typeEvent, handler, delegationSelector) {
    const fn = findHandler(events[typeEvent], handler, delegationSelector)
    if (fn === null) {
      return
    }

    element.removeEventListener(typeEvent, fn, Boolean(delegationSelector))
    delete events[typeEvent][fn.uidEvent]
  }

  function removeNamespacedHandlers(element, events, typeEvent, namespace) {
    const storeElementEvent = events[typeEvent] || {}
    for (const handlerKey in storeElementEvent) {
      if (!Object.prototype.hasOwnProperty.call(storeElementEvent, handlerKey)) {
        continue
      }

      if (handlerKey.indexOf(namespace) > -1) {
        const event = storeElementEvent[handlerKey]
        removeHandler(element, events, typeEvent, event.originalHandler, event.delegationSelector)
      }
    }
  }

  return {
    on(element, event, handler, delegationFn) {
      addHandler(element, event, handler, delegationFn, false)
    },

    one(element, event, handler, delegationFn) {
      addHandler(element, event, handler, delegationFn, true)
    },

    off(element, originalTypeEvent, handler, delegationFn) {
      if (typeof originalTypeEvent !== 'string' || (typeof element === 'undefined' || element === null)) {
        return
      }

      const [delegation, originalHandler, typeEvent] = normalizeParams(originalTypeEvent, handler, delegationFn)

      const inNamespace = typeEvent !== originalTypeEvent
      const events = getEvent(element)

      if (typeof originalHandler !== 'undefined') {
        // Simplest case: handler is passed, remove that listener ONLY.
        if (!events || !events[typeEvent]) {
          return
        }

        removeHandler(element, events, typeEvent, originalHandler, delegation ? handler : null)
        return
      }

      const isNamespace = originalTypeEvent.charAt(0) === '.'
      if (isNamespace) {
        for (const elementEvent in events) {
          if (!Object.prototype.hasOwnProperty.call(events, elementEvent)) {
            continue
          }

          removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.substr(1))
        }
      }

      const storeElementEvent = events[typeEvent] || {}
      for (const keyHandlers in storeElementEvent) {
        if (!Object.prototype.hasOwnProperty.call(storeElementEvent, keyHandlers)) {
          continue
        }

        const handlerKey = keyHandlers.replace(stripUidRegex, '')
        if (!inNamespace || originalTypeEvent.indexOf(handlerKey) > -1) {
          const event = storeElementEvent[keyHandlers]
          removeHandler(element, events, typeEvent, event.originalHandler, event.delegationSelector)
        }
      }
    },

    trigger(element, event, args) {
      if (typeof event !== 'string' ||
          (typeof element === 'undefined' || element === null)) {
        return null
      }

      const typeEvent   = event.replace(stripNameRegex, '')
      const inNamespace = event !== typeEvent
      const isNative    = nativeEvents.indexOf(typeEvent) > -1

      const $ = Util.jQuery
      let jQueryEvent

      let bubbles = true
      let nativeDispatch = true
      let defaultPrevented = false

      if (inNamespace && typeof $ !== 'undefined') {
        jQueryEvent = $.Event(event, args)

        $(element).trigger(jQueryEvent)
        bubbles = !jQueryEvent.isPropagationStopped()
        nativeDispatch = !jQueryEvent.isImmediatePropagationStopped()
        defaultPrevented = jQueryEvent.isDefaultPrevented()
      }

      let evt = null
      if (isNative) {
        evt = document.createEvent('HTMLEvents')
        evt.initEvent(typeEvent, bubbles, true)
      } else {
        evt = new CustomEvent(event, {
          bubbles,
          cancelable: true
        })
      }

      // merge custom informations in our event
      if (typeof args !== 'undefined') {
        evt = Object.assign(evt, args)
      }

      if (defaultPrevented) {
        evt.preventDefault()

        if (!Polyfill.defaultPreventedPreservedOnDispatch) {
          Object.defineProperty(evt, 'defaultPrevented', {
            get: () => true
          })
        }
      }

      if (nativeDispatch) {
        element.dispatchEvent(evt)
      }

      if (evt.defaultPrevented && typeof jQueryEvent !== 'undefined') {
        jQueryEvent.preventDefault()
      }

      return evt
    }
  }
})()

export default EventHandler