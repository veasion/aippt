/* eslint-disable @typescript-eslint/no-unused-vars */
// import { geometryPaths } from './geometry.js'
// import { drawChart } from './chart.js'

function D3Element(element) {
    this.attr = function (k, v) {
        if (v == undefined) {
            return element.getAttribute(k)
        } else {
            element.setAttribute(k, v)
            return this
        }
    }
    this.style = function (k, v) {
        if (v == undefined) {
            return element.style[k]
        } else {
            element.style[k] = v
            return this
        }
    }
    this.text = function (v) {
        if (v == undefined) {
            return element.textContent
        } else {
            element.textContent = v
            return this
        }
    }
    this.append = function (tag) {
        let node = document.createElementNS('http://www.w3.org/2000/svg', tag)
        element.appendChild(node)
        return new D3Element(node)
    }
    this.parent = function () {
        return element.parentNode ? new D3Element(element.parentNode) : null
    }
    this.node = function () {
        return element
    }
    this.html = function (v) {
        if (v == undefined) {
            return element.innerHTML
        } else {
            element.innerHTML = v
            return this
        }
    }
    this.translate = function (x, y, start) {
        let transform = element.getAttribute('transform')
        if (x == undefined && y == undefined) {
            x = y = 0
            if (transform) {
                let idx = transform.indexOf('translate')
                if (idx > -1) {
                    let arr = transform.substring(idx + 10, transform.indexOf(')', idx + 10)).replace('(', '').split(',')
                    x = parseFloat(arr[0] || 0)
                    y = parseFloat(arr[1] || 0)
                }
            }
            return { x, y }
        } else {
            if (y == undefined) {
                y = 0
            }
            if (transform) {
                let idx = transform.indexOf('translate')
                if (idx > -1) {
                    let eIdx = transform.indexOf(')', idx + 10)
                    transform = transform.substring(0, idx) + `translate(${x}, ${y})` + transform.substring(eIdx + 1)
                    element.setAttribute('transform', transform.trim())
                } else {
                    element.setAttribute('transform', start ? `translate(${x}, ${y}) ${transform}`: `${transform} translate(${x}, ${y})`)
                }
            } else {
                element.setAttribute('transform', `translate(${x}, ${y})`)
            }
            return this
        }
    }
    this.scale = function (x, y, start) {
        let transform = element.getAttribute('transform')
        if (x == undefined && y == undefined) {
            x = y = 1
            if (transform) {
                let idx = transform.indexOf('scale')
                if (idx > -1) {
                    let arr = transform.substring(idx + 6, transform.indexOf(')', idx + 6)).replace('(', '').split(',')
                    x = parseFloat(arr[0] || 0)
                    y = arr[1] == undefined ? x : parseFloat(arr[1])
                }
            }
            return { x, y }
        } else {
            if (y == undefined) {
                y = x
            }
            if (transform) {
                let idx = transform.indexOf('scale')
                if (idx > -1) {
                    let eIdx = transform.indexOf(')', idx + 6)
                    transform = transform.substring(0, idx) + `scale(${x}, ${y})` + transform.substring(eIdx + 1)
                    element.setAttribute('transform', transform.trim())
                } else {
                    element.setAttribute('transform', start ? `scale(${x}, ${y}) ${transform}` : `${transform} scale(${x}, ${y})`)
                }
            } else {
                element.setAttribute('transform', `scale(${x}, ${y})`)
            }
            return this
        }
    }
    this.getFlipXy = function () {
        let transform = element.getAttribute('transform')
        let flipX = 1, flipY = 1
        if (transform) {
            let idx = -1
            while ((idx = transform.indexOf('scale', idx + 1)) > -1) {
                let arr = transform.substring(idx + 6, transform.indexOf(')', idx + 6)).replace('(', '').split(',')
                let x = parseFloat(arr[0] || 0) < 0 ? -1 : 1
                let y = (arr[1] == undefined ? x : parseFloat(arr[1])) < 0 ? -1 : 1
                flipX *= x
                flipX *= y
                idx += 8
            }
        }
        return { flipX, flipY }
    }
    this.rotate = function (rotate, x, y, start) {
        let transform = element.getAttribute('transform')
        if (rotate == undefined) {
            x = y = 0
            if (transform) {
                let idx = transform.indexOf('rotate')
                if (idx > -1) {
                    let arr = transform.substring(idx + 7, transform.indexOf(')', idx + 7)).replace('(', '').split(',')
                    rotate = parseFloat(arr[0] || 0)
                    x = arr[1] == undefined ? 0 : parseFloat(arr[1])
                    y = arr[2] == undefined ? 0 : parseFloat(arr[2])
                }
            }
            return { rotate, x, y }
        } else {
            let transformRotate = rotate ? `rotate(${rotate})` : ''
            if (x != undefined && y != undefined) {
                transformRotate = `rotate(${rotate}, ${x}, ${y})`
            }
            if (transform) {
                let idx = transform.indexOf('rotate')
                if (idx > -1) {
                    let eIdx = transform.indexOf(')', idx + 7)
                    transform = transform.substring(0, idx) + transformRotate + transform.substring(eIdx + 1)
                    element.setAttribute('transform', transform.trim())
                } else {
                    element.setAttribute('transform', start ? `${transformRotate} ${transform}` : `${transform} ${transformRotate}`)
                }
            } else {
                element.setAttribute('transform', transformRotate)
            }
            return this
        }
    }
}

const d3 = {
    select: function (o) {
        return new D3Element((typeof o == 'string') ? document.querySelector(o) : o)
    },
    addEventListener: function (type, event, fun) {
        if (type === 'window') {
            window.addEventListener(event, fun)
        } else if (type === 'document') {
            document.addEventListener(event, fun)
        }
    }
}

function Ppt2Svg(_svg, svgWidth, svgHeight) {
    var pptx = null
    var page = null
    var imageCache = {}
    var pageIndex = 0
    var ctx = {}
    var idMap = {}
    var counter = 0
    var zoom = 1
    var defs = null
    var mode = 'view'
    var pointList = []
    var mTimer = null
    var currentPoint = null
    var currentSelect = null
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const $this = this
    const svg = d3.select((typeof _svg == 'string') ? ('#' + _svg) : _svg)
                .attr('width', svgWidth || 960)
                .attr('height', svgHeight || 540)

    this.drawPptx = (pptxObj, pageIdx, selectElementId) => {
        removePoint()
        removeElementMoveScale()
        ctx = {}
        idMap = {}
        imageCache = {}
        counter = 0
        pptx = pptxObj
        pageIndex = pageIdx
        zoom = svgWidth / pptx.width
        svg.html('')
        defs = svg.append('defs')
        page = pptxObj.pages[pageIdx]
        let placeholder = {}
        let slideMasterIdx = page.extInfo.slideMasterIdx
        if (slideMasterIdx != null && pptxObj.slideMasters) {
            let slideMaster = pptxObj.slideMasters[slideMasterIdx]
            let slideLayoutIdx = page.extInfo.slideLayoutIdx
            let slideLayout = slideLayoutIdx != null ? slideMaster.slideLayouts[slideLayoutIdx] : null
            drawBackground(page.extInfo.background || (slideLayout || {}).background || slideMaster.background)
            drawSlideMaster(slideMaster, slideLayout, placeholder)
            if (slideLayout) {
                drawSlideLayout(slideLayout, placeholder)
            }
        } else {
            drawBackground(page.extInfo.background)
        }
        if (!page.children) {
            return
        }
        recursion(page.children, obj => {
            idMap[obj.id] = obj
            if (obj.extInfo.property && obj.extInfo.property.placeholder) {
                // 继承母版占位符
                let element_property = obj.extInfo.property
                let placeholder_property = placeholder[element_property.placeholder.type] || {}
                for (let k in placeholder_property) {
                    if (element_property[k] == null) {
                        element_property[k] = placeholder_property[k]
                    }
                }
            }
        })
        for (let i = 0; i < page.children.length; i++) {
            drawElement(page.children[i])
        }
        recursion(page.children, obj => {
            idMap[obj.id] = obj
        })
        calcPointList(page)
        if (selectElementId) {
            addElementMoveScale(idMap[selectElementId])
        }
    }

    this.svgNode = () => {
        return svg.node()
    }

    this.resetSize = (_svgWidth, _svgHeight) => {
        svgWidth = _svgWidth || svgWidth
        svgHeight = _svgHeight || svgHeight
        svg.attr('width', svgWidth).attr('height', svgHeight)
        if (pptx) {
            zoom = svgWidth / pptx.width
            this.drawPptx(pptx, pageIndex)
        }
    }

    this.setMode = (_mode) => {
        // view / edit
        mode = _mode || 'view'
        return mode
    }

    function scaleAnchor(point) {
        return point ? [...point.map(s => s * zoom)] : point
    }

    function scaleValue(value) {
        return value ? value * zoom : value
    }

    function shapeHandle(property, parent, isText) {
        let g = parent.append('g')
        let anchor = scaleAnchor(property.anchor)
        if (!anchor) {
            return g
        }
        let transform = []
        let cx = anchor[0] + anchor[2] / 2
        let cy = anchor[1] + anchor[3] / 2
        transform.push(`rotate(${property.rotation || 0}, ${cx}, ${cy})`)
        if (property.rotation) {
            if (property.realType == 'Group') {
                ctx.groupRotation = (ctx.groupRotation || 0) + property.rotation
            }
        }
        if (isText) {
            let x = ctx.groupFlipX || 1
            let y = ctx.groupFlipY || 1
            if (property.flipVertical) {
                y *= -1
                transform.push(`translate(${cx}, ${cy})`)
                transform.push(`scale(1, -1)`)
                transform.push(`translate(${-cx}, ${-cy})`)
            }
            if (y == -1) {
                if (x == 1) {
                    transform.push(`translate(${cx}, ${cy})`)
                    transform.push(`scale(-1, 1)`)
                    transform.push(`translate(${-cx}, ${-cy})`)
                }
            } else if (x == -1) {
                transform.push(`translate(${cx}, ${cy})`)
                transform.push(`scale(-1, 1)`)
                transform.push(`translate(${-cx}, ${-cy})`)
            }
        } else {
            if (property.flipVertical) {
                transform.push(`translate(${cx}, ${cy})`)
                transform.push(`scale(1, -1)`)
                transform.push(`translate(${-cx}, ${-cy})`)
                if (property.realType == 'Group') {
                    ctx.groupFlipY = -(ctx.groupFlipY || 1)
                }
            }
            if (property.flipHorizontal) {
                transform.push(`translate(${cx}, ${cy})`)
                transform.push(`scale(-1, 1)`)
                transform.push(`translate(${-cx}, ${-cy})`)
                if (property.realType == 'Group') {
                    ctx.groupFlipX = -(ctx.groupFlipX || 1)
                }
            }
        }
        // 嵌套容器 Group
        let interior = scaleAnchor(property.interiorAnchor)
        if (interior && interior.length > 0) {
            let scaleX = interior[2] == 0 || anchor[2] == interior[2] ? 1 : anchor[2] / interior[2]
            let scaleY = interior[3] == 0 || anchor[3] == interior[3] ? 1 : anchor[3] / interior[3]
            let tx = anchor[0] - interior[0] * scaleX
            let ty = anchor[1] - interior[1] * scaleY
            transform.push(`translate(${tx}, ${ty})`)
            ctx._interior = ctx.interior
            ctx.interior = { scaleX, scaleY, tx, ty }
        } else if (property.realType == 'Group') {
            ctx._interior = ctx.interior
            ctx.interior = { scaleX: 1, scaleY: 1, tx: 0, ty: 0 }
        } else if (ctx.interior) {
            g.attr('interior', JSON.stringify(ctx.interior))
        }
        if (transform.length > 0) {
            g.attr('transform', transform.join(' '))
        }
        return g
    }

    function drawBackground(background) {
        if (!background) {
            ctx.bgAnchor = null
            ctx.bgFillStyle = null
            return
        }
        let anchor = scaleAnchor(background.anchor)
        ctx.bgAnchor = anchor
        ctx.bgFillStyle = background.fillStyle
        let fill = toPaint(background.fillStyle, anchor)
        svg.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', anchor[2])
            .attr('height', anchor[3])
            .attr('fill', fill)
            .node().addEventListener('click', function (e) {
                if (!currentPoint) {
                    removeElementMoveScale()
                }
            })
    }

    function drawSlideMaster(slideMaster, slideLayout, placeholder) {
        recursion(slideMaster.children, obj => {
            if (obj.extInfo.property && obj.extInfo.property.placeholder) {
                obj.noDraw = true
                placeholder[obj.extInfo.property.placeholder.type] = obj.extInfo.property
            }
        })
        if (slideLayout && slideLayout.noMaster) {
            return
        }
        for (let i = 0; slideMaster.children && i < slideMaster.children.length; i++) {
            drawElement(slideMaster.children[i])
        }
    }

    function drawSlideLayout(slideLayout, placeholder) {
        recursion(slideLayout.children, obj => {
            if (obj.extInfo.property && obj.extInfo.property.placeholder) {
                obj.noDraw = true
                placeholder[obj.extInfo.property.placeholder.type] = obj.extInfo.property
            }
        })
        for (let i = 0; slideLayout.children && i < slideLayout.children.length; i++) {
            drawElement(slideLayout.children[i])
        }
    }

    function recursion(children, fn) {
        if (!children) {
            return
        }
        for (let i = 0; i < children.length; i++) {
            let c = children[i]
            fn(c)
            if (c.children && c.children.length > 0) {
                recursion(c.children, fn)
            }
        }
    }

    function drawElement(obj, parent) {
        if (obj.noDraw || !obj.extInfo.property.anchor || obj.extInfo.property.hidden) {
            // console.log('ignore element:', obj)
            return
        }
        if (!parent) {
            parent = svg
        }
        if (obj.type == 'text' || obj.type == 'freeform') {
            drawText(obj, parent)
        } else if (obj.type == 'image') {
            drawImage(obj, parent)
        } else if (obj.type == 'diagram') {
            drawDiagram(obj, parent)
        } else if (obj.type == 'container') {
            drawContainer(obj, parent)
        } else if (obj.type == 'table') {
            drawTable(obj, parent)
        } else if (obj.type == 'connector') {
            drawConnector(obj, parent)
        } else if (obj.type == 'graphicFrame') {
            drawGraphicFrame(obj, parent)
        }
    }

    this.redrawElementWithId = (id) => {
        let obj = idMap[id]
        if (obj.noDraw || !obj.extInfo.property.anchor || obj.extInfo.property.hidden) {
            return
        }
        let parent = idMap[obj.pid]
        while (parent) {
            if (parent.type == 'container') {
                // 重新渲染页面
                this.drawPptx(pptx, pageIndex, id)
                return
            }
            parent = idMap[parent.pid]
        }
        let list = []
        if (obj.point) {
            let x = obj.point[0]
            let y = obj.point[1]
            let endX = obj.point[0] + obj.point[2]
            let endY = obj.point[1] + obj.point[3]
            for (let i = 0; i < pointList.length; i++) {
                let point = pointList[i]
                if (point.obj.id == id) {
                    break
                }
                if (point.x >= x && point.y >= y && point.endX <= endX && point.endY <= endY) {
                    list.push(point.obj)
                } else if (point.y > y && point.y < endY && (point.x > x && point.x < endX || point.endX > x && point.endX < endX)) {
                    list.push(point.obj)
                } else if (point.x > x && point.x < endX && (point.y > y && point.y < endY || point.endY > y && point.endY < endY)) {
                    list.push(point.obj)
                }
                if (list.length > 0) {
                    // 重新渲染页面
                    this.drawPptx(pptx, pageIndex, id)
                    return
                }
            }
        }
        let element = document.getElementById('g-' + obj.id)
        if (element) {
            element.remove()
            let parent = element.parentNode ? d3.select(element.parentNode) : null
            drawElement(obj, parent)
        }
        page && calcPointList(page)
        if (currentSelect) {
            addElementMoveScale(currentSelect)
        }
    }

    function drawText(obj, parent) {
        let property = obj.extInfo.property
        let geometryName = (property.geometry || {}).name || 'rect'
        let g = shapeHandle(property, parent, true)
        g.attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        if (geometryName == 'tableColumn') {
            drawTableColumn(property, g)
        } else {
            drawGeometry(property, g)
        }
        if (!obj.children || obj.children.length == 0) {
            return
        }
        drawTextWithG(g, obj)
    }

    function drawTextWithG(g, obj) {
        let childNodes = g.node().childNodes
        for (let i = childNodes.length - 1; i >= 0; i--) {
            if (childNodes[i].tagName == 'text') {
                childNodes[i].remove()
            }
        }
        if (!obj.children || obj.children.length == 0) {
            return
        }
        let property = obj.extInfo.property
        let anchor = scaleAnchor(property.anchor)
        let wordWrap = property.textWordWrap ?? true
        let textInsets = property.textInsets || [0, 0, 0, 0]
        let isVertical = property.textDirection && property.textDirection.indexOf('VERTICAL') > -1
        let verticalAlignment = property.textVerticalAlignment
        let textNode = g.append('text').attr('id', obj.id).attr('x', anchor[0]).attr('y', anchor[1])
        textNode.style('user-select', 'none')
        if (isVertical) {
            textNode.style('writing-mode', 'vertical-rl')
        }
        let marginTop = property.strokeStyle ? scaleValue(property.strokeStyle.lineWidth || 1) : 0
        let maxFontSize = 0
        let maxWidth = anchor[2] - textInsets[1] - textInsets[3]
        for (let i = 0; i < obj.children.length; i++) {
            let p = obj.children[i]
            let p_property = p.extInfo.property
            let textAlign = p_property.textAlign
            let lineSpacing = p_property.lineSpacing > 0 ? (p_property.lineSpacing / 100) : (1 + Math.abs(p_property.lineSpacing || 0) / 100)
            let createPNode = () => {
                let pNode = textNode.append('tspan').attr('id', p.id)
                if (textAlign == 'CENTER') {
                    pNode.attr('x', anchor[0] + (anchor[2] - textInsets[1] - textInsets[3]) / 2 + textInsets[1])
                    pNode.attr('text-anchor', 'middle')
                } else if (textAlign == 'RIGHT') {
                    pNode.attr('x', anchor[0] + anchor[2] - textInsets[3])
                    pNode.attr('text-anchor', 'end')
                } else {
                    pNode.attr('x', anchor[0] + textInsets[1])
                    pNode.attr('text-anchor', 'start')
                }
                return pNode
            }
            let pNode = createPNode()
            for (let i = 0; i < p.children.length; i++) {
                let r = p.children[i]
                let r_property = r.extInfo.property
                if (r_property.slideNum) {
                    r.text = (pageIndex + 1) + ''
                }
                let fontSize = scaleValue(r_property.fontSize || 16)
                let createRNode = (_pNode) => {
                    let rNode = _pNode.append('tspan').attr('id', r.id)
                    if (r_property.bold) {
                        rNode.style('font-weight', 'bold')
                    }
                    if (r_property.italic) {
                        rNode.style('font-style', 'italic')
                    }
                    if (r_property.underlined) {
                        rNode.style('text-decoration', 'underline')
                    }
                    rNode.style('cursor', 'text')
                    rNode.style('font-size', fontSize + 'px')
                    rNode.style('font-family', (r_property.fontFamily || '等线'))
                    let filter = toShadow(r_property.shadow, anchor)
                    if (filter) {
                        rNode.attr('filter', filter)
                    }
                    if (r_property.line && (r_property.fontColor == null || r_property.fontColor.type == 'noFill')) {
                        let fillStyle = toPaint(r_property.line.paint, anchor)
                        rNode.attr('fill', 'none')
                        rNode.attr('stroke', fillStyle)
                        rNode.attr('stroke-width', scaleValue(r_property.line.lineWidth || 1))
                    } else {
                        let params = {}
                        if (r_property.fontColor.type == 'texture') {
                            params.tx = anchor[0]
                            params.ty = anchor[1] + marginTop
                        }
                        let fillStyle = toPaint(r_property.fontColor, anchor, params)
                        rNode.attr('fill', fillStyle)
                    }
                    addRunTextEvent(rNode, obj)
                    return rNode
                }
                maxFontSize = Math.max(fontSize, maxFontSize)
                let rNode = createRNode(pNode)
                if (isVertical) {
                    // 竖版
                    rNode.text(r.text)
                } else {
                    // 横版
                    rNode.text(r.text)
                    if (wordWrap && pNode.node().getComputedTextLength() > maxWidth && r.text.length > 1) {
                        // 自动换行
                        let start = 0
                        for (let s = 1; s <= r.text.length; s++) {
                            let text = r.text.substring(start, s)
                            rNode.text(text)
                            if (pNode.node().getComputedTextLength() > maxWidth - maxFontSize / 2) {
                                marginTop += (maxFontSize * lineSpacing)
                                pNode.attr('y', anchor[1] + marginTop)
                                pNode = createPNode()
                                rNode = createRNode(pNode)
                                start = s
                            }
                        }
                    }
                }
            }
            if (isVertical) {
                if (verticalAlignment == 'MIDDLE') {
                    pNode.attr('x', anchor[0] + maxFontSize * (obj.children.length - i - 1) + (anchor[2] - maxFontSize * obj.children.length) / 2)
                } else if (verticalAlignment == 'TOP') {
                    pNode.attr('x', anchor[0] + anchor[2] - maxFontSize * (i + 1))
                } else {
                    pNode.attr('x', anchor[0] + maxFontSize * (obj.children.length - i - 1))
                }
                pNode.attr('y', anchor[1])
            } else {
                marginTop += (maxFontSize * lineSpacing)
                pNode.attr('y', anchor[1] + marginTop)
            }
        }
        let yHeight = 0
        if (verticalAlignment == 'MIDDLE') {
            let height = textNode.node().getBBox().height
            yHeight = (anchor[3] - height - textInsets[0] - textInsets[2]) / 2 + textInsets[0] - maxFontSize / 4
        } else if (verticalAlignment == 'BOTTOM') {
            let height = textNode.node().getBBox().height
            yHeight = anchor[3] - height - textInsets[2]
        }
        if (yHeight != 0) {
            let childNodes = textNode.node().childNodes
            for (let i = 0; i < childNodes.length; i++) {
                let pNode = childNodes[i]
                let y = +pNode.getAttribute('y') + yHeight
                pNode.setAttribute('y', y)
            }
        }
    }

    function drawImage(obj, parent) {
        let property = obj.extInfo.property
        let g = shapeHandle(property, parent)
        g.attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        if (property.fillStyle && property.fillStyle.texture) {
            property.fillStyle.texture.imageData = property.image
            // 图片自带拉伸
            property.fillStyle.texture.stretch = property.fillStyle.texture.stretch || [0, 0, 0, 0]
        } else {
            property.fillStyle = { 'type': 'texture', texture: { 'imageData': property.image, insets: property.clipping, stretch: [0, 0, 0, 0] } }
        }
        drawGeometry(property, g, obj.id)
    }

    function drawTableColumn(property, parent) {
        let anchor = scaleAnchor(property.anchor)
        let x = anchor[0] - 1
        let endX = anchor[0] + anchor[2] + 1
        let y = anchor[1] - 1
        let endY = anchor[1] + anchor[3] + 1
        let borders = scaleAnchor(property.borders) // top/left/bottom/right
        // top
        let top = borders[0]
        let lineWidth = scaleValue(top.lineWidth)
        let stroke = toColor({ color: top.color }, 'white')
        parent.append('line')
                .attr('x1', x).attr('y1', y)
                .attr('x2', endX).attr('y2', y)
                .attr('style', `stroke: ${stroke};stroke-width: ${lineWidth}`)
        // right
        let right = borders[3]
        lineWidth = scaleValue(right.lineWidth)
        stroke = toColor({ color: right.color }, 'white')
        parent.append('line')
                    .attr('x1',endX).attr('y1', y)
                    .attr('x2', endX).attr('y2', endY)
                    .attr('style', `stroke: ${stroke};stroke-width: ${lineWidth}`)
        // bottom
        let bottom = borders[2]
        lineWidth = scaleValue(bottom.lineWidth)
        stroke = toColor({ color: bottom.color }, 'white')
        parent.append('line')
                    .attr('x1',endX).attr('y1', endY)
                    .attr('x2', x).attr('y2', endY)
                    .attr('style', `stroke: ${stroke};stroke-width: ${lineWidth}`)
        // left
        let left = borders[1]
        lineWidth = scaleValue(left.lineWidth)
        stroke = toColor({ color: left.color }, 'white')
        parent.append('line')
                    .attr('x1',x).attr('y1', endY)
                    .attr('x2', x).attr('y2', y)
                    .attr('style', `stroke: ${stroke};stroke-width: ${lineWidth}`)
        if (property.fillStyle) {
            let fill = toPaint(property.fillStyle, anchor)
            parent.append('rect')
            .attr('x', anchor[0]).attr('y', anchor[1])
            .attr('width', anchor[2])
            .attr('height', anchor[3])
            .attr('fill', fill)
            .attr('stroke', 'none')
        }
    }

    function drawDiagram(obj, parent) {
        let property = obj.extInfo.property
        let anchor = scaleAnchor(property.anchor)
        let g = parent.append('g').attr('id', obj.id).attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        g.attr('transform', `translate(${anchor[0]}, ${anchor[1]})`)
        for (let i = 0; i < obj.children.length; i++) {
            drawElement(obj.children[i], g)
        }
    }

    function drawContainer(obj, parent) {
        let property = obj.extInfo.property
        let _groupFlipX = ctx.groupFlipX
        let _groupFlipY = ctx.groupFlipY
        let _groupRotation = ctx.groupRotation
        let g = shapeHandle(property, parent)
        g.attr('id', obj.id).attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        if (property.realType == 'Group') {
            let parentGroupFillStyle = ctx.groupFillStyle
            let groupFillStyle = property.groupFillStyle
            if (groupFillStyle) {
                groupFillStyle = JSON.parse(JSON.stringify(groupFillStyle))
                groupFillStyle.groupAnchor = scaleAnchor(property.anchor)
                if (parentGroupFillStyle) {
                    groupFillStyle.parentGroupFillStyle = parentGroupFillStyle
                }
            }
            ctx.groupFillStyle = groupFillStyle
            let copyChildren = JSON.parse(JSON.stringify(obj.children))
            recursionGroupChildren(copyChildren, c => {
                if (c.extInfo && c.extInfo.property && c.extInfo.property.anchor) {
                    let anchor = c.extInfo.property.anchor
                    anchor[0] *= ctx.interior.scaleX
                    anchor[1] *= ctx.interior.scaleY
                    anchor[2] *= ctx.interior.scaleX
                    anchor[3] *= ctx.interior.scaleY
                }
            })
            for (let i = 0; i < copyChildren.length; i++) {
                drawElement(copyChildren[i], g)
            }
            ctx.interior = ctx._interior
        } else {
            for (let i = 0; i < obj.children.length; i++) {
                drawElement(obj.children[i], g)
            }
        }
        ctx.groupFlipX = _groupFlipX
        ctx.groupFlipY = _groupFlipY
        ctx.groupRotation = _groupRotation
    }

    function recursionGroupChildren(children, fn) {
        if (!children) {
            return
        }
        for (let i = 0; i < children.length; i++) {
            let c = children[i]
            fn(c)
            if (c.extInfo && c.extInfo.property.realType == 'Group') {
                continue
            }
            if (c.children && c.children.length > 0) {
                recursionGroupChildren(c.children, fn)
            }
        }
    }

    function drawConnector(obj, parent) {
        let property = obj.extInfo.property
        let g = parent.append('g').attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        drawGeometry(property, g, obj.id)
    }

    function drawGraphicFrame(obj, parent) {
        let property = obj.extInfo.property
        let anchor = scaleAnchor(property.anchor)
        let g = parent.append('g').attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        if (property.chart && property.chart.chartData && property.chart.chartData.length > 0) {
            drawChart(property.chart, [0, 0, anchor[2], anchor[3]]).then(canvas => {
                let imgSrc = canvas.toDataURL('image/png')
                let fill = toPaint({ 'type': 'texture', texture: { 'imageData': imgSrc, stretch: [0, 0, 0, 0] } }, anchor)
                g.append('rect')
                        .attr('id', obj.id)
                        .attr('width', anchor[2])
                        .attr('height', anchor[3])
                        .attr('transform', `translate(${anchor[0]}, ${anchor[1]})`)
                        .attr('fill', fill)
            })
        }
    }

    function drawTable(obj, parent) {
        let property = obj.extInfo.property
        let g = parent.append('g').attr('id', obj.id).attr('id', 'g-' + obj.id)
        addElementEvent(g, obj)
        for (let i = 0; i < obj.children.length; i++) {
            let row = obj.children[i]
            drawTableRow(obj, row, g)
        }
    }

    function drawTableRow(table, row, parent) {
        let property = row.extInfo.property
        for (let i = 0; i < row.children.length; i++) {
            let column = row.children[i]
            drawText(column, parent)
        }
    }

    function drawGeometry(property, parent, id) {
        if (!parent) {
            parent = svg
        }
        let anchor = scaleAnchor(property.anchor)
        let stroke = null
        let lineWidth = scaleValue(1)
        if (property.strokeStyle) {
            lineWidth = scaleValue(property.strokeStyle.lineWidth || 1)
            stroke = toPaint(property.strokeStyle.paint, anchor)
        }
        let paths = geometryPaths(property, zoom)
        for (let i = 0; i < paths.length; i++) {
            let path = paths[i]
            let pathNode = parent.append('path')
            if (id) {
                pathNode.attr('id', id)
            }
            pathNode.attr('d', path.path)
            let transform = `translate(${anchor[0]},${anchor[1]})`
            if (path.scaleX && path.scaleY) {
                transform += ` scale(${path.scaleX || 1},${path.scaleY || 1})`
            }
            pathNode.attr('transform', transform)
            let fill = null
            if (property.fillStyle) {
                let scaleX = 1 / path.scaleX
                let scaleY = 1 / path.scaleY
                let params = { scaleX, scaleY }
                if (property.fillStyle.type == 'bgFill') {
                    if (ctx.interior) {
                        params.tx = -ctx.interior.tx - anchor[0]
                        params.ty = -ctx.interior.ty - anchor[1]
                    } else {
                        params.tx = -anchor[0]
                        params.ty = -anchor[1]
                    }
                    params.width = anchor[2]
                    params.height = anchor[3]
                    params.rotation = -((property.rotation || 0) + (ctx.groupRotation || 0))
                }
                fill = toPaint(property.fillStyle, anchor, params)
            }
            if (path.filled && fill) {
                pathNode.attr('fill', fill)
            } else {
                pathNode.attr('fill', 'transparent')
            }
            if (path.stroked) {
                pathNode.attr('stroke', stroke)
                pathNode.attr('stroke-width', path.scaleY ? lineWidth / path.scaleY : lineWidth)
            }
            let filter = toShadow(property.shadow, anchor, path.scaleX, path.scaleY)
            if (filter) {
                pathNode.attr('filter', filter)
            }
        }
    }

    function toShadow(shadow, anchor, scaleX, scaleY) {
        if (!shadow) {
            return null
        }
        scaleX = scaleX || 1
        scaleY = scaleY || 1
        let stdDeviation = (shadow.blur || 0) / Math.max(scaleX, scaleY) / 5
        let distance = scaleValue(shadow.distance)
        let color = toColor(shadow.fillStyle.color)
        let filterId = 'shadow' + (++counter)
        let filter = defs.append('filter').attr('id', filterId)
        if (anchor && distance && (distance >= anchor[2] / 2 || distance >= anchor[3] / 2)) {
            filter.attr('x', '-100%').attr('y', '-100%').attr('width', '400%').attr('height', '400%')
        } else {
            filter.attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
        }
        filter.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', stdDeviation).attr('result', 'blur')
        filter.append('feFlood').attr('flood-color', color).attr('result', 'color')
        filter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'shadow')
        if (distance) {
            let radians = (shadow.angle || 0) * Math.PI / 180
            let x = 0, y = 0
            let rx = distance / scaleX
            let ry = distance / scaleY
            let shadowOffsetX = x + rx * Math.cos(radians)
            let shadowOffsetY = y + ry * Math.sin(radians)
            filter.append('feOffset').attr('dx', shadowOffsetX).attr('dy', shadowOffsetY).attr('result', 'offsetBlur')
        }
        let feMerge = filter.append('feMerge')
        feMerge.append('feMergeNode').attr('in', 'offsetBlur')
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
        return `url(#${filterId})`
    }

    function toPaint(paint, anchor, params) {
        if (!paint) {
            return 'transparent'
        } else if (paint.type == 'noFill') {
            // 无填充
            return 'transparent'
        } else if (paint.type == 'color') {
            // 颜色
            return toColor(paint.color)
        } else if (paint.type == 'bgFill') {
            // 背景填充
            if (ctx.bgFillStyle) {
                return toPaint(ctx.bgFillStyle, ctx.bgAnchor || anchor, params)
            } else {
                return 'transparent'
            }
        } else if (paint.type == 'groupFill') {
            // 组合背景
            let groupFillStyle = paint.parentGroupFillStyle || ctx.groupFillStyle
            if (groupFillStyle) {
                return toPaint(groupFillStyle, scaleAnchor(groupFillStyle.groupAnchor) || anchor, params)
            } else {
                return 'transparent'
            }
        } else if (paint.type == 'gradient') {
            // 渐变
            let gradient = paint.gradient
            let x = 0, y = 0
            let width = anchor[2], height = anchor[3]
            let centerX = x + width / 2
            let centerY = y + height / 2
            let gradientNode
            // linear,circular,rectangular,shape
            if (gradient.gradientType == 'circular') {
                // 射线
                let cx = centerX + width * (gradient.insets[1] - gradient.insets[3]) / 2
                let cy = centerY + height * (gradient.insets[0] - gradient.insets[2]) / 2
                // let radius = Math.sqrt(width * width + height * height) * (gradient.insets[1] == 0.5 ? 0.5 : 1)
                let _cx = ((cx / width) * 100).toFixed(0) + '%'
                let _cy = ((cy / height) * 100).toFixed(0) + '%'
                let _r = (gradient.insets[1] * 100).toFixed(0) + '%'
                gradientNode = defs.append('radialGradient').attr('cx', _cx).attr('cy', _cy).attr('r', _r).attr('fx', _cx).attr('fy', _cy)
            } else {
                // 线性
                let startX = x
                let startY = centerY
                let endX = x + width
                let endY = centerY
                if (gradient.angle) {
                    let radians = gradient.angle * Math.PI / 180
                    let midX = (startX + endX) / 2
                    let midY = (startY + endY) / 2
                    let newStartX = midX + (startX - midX) * Math.cos(radians) - (startY - midY) * Math.sin(radians)
                    let newStartY = midY + (startX - midX) * Math.sin(radians) + (startY - midY) * Math.cos(radians)
                    let newEndX = midX + (endX - midX) * Math.cos(radians) - (endY - midY) * Math.sin(radians)
                    let newEndY = midY + (endX - midX) * Math.sin(radians) + (endY - midY) * Math.cos(radians)
                    startX = newStartX
                    startY = newStartY
                    endX = newEndX
                    endY = newEndY
                }
                let x1 = ((startX / width) * 100).toFixed(0) + '%'
                let y1 = ((startY / height) * 100).toFixed(0) + '%'
                let x2 = ((endX / width) * 100).toFixed(0) + '%'
                let y2 = ((endY / height) * 100).toFixed(0) + '%'
                gradientNode = defs.append('linearGradient').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
            }
            let gradientId = 'gradient' + (++counter)
            gradientNode.attr('id', gradientId)
            for (let i = 0; i < gradient.colors.length; i++) {
                let color = toColor(gradient.colors[i])
                let offset = (gradient.fractions[i] * 100).toFixed(0) + '%'
                gradientNode.append('stop').attr('offset', offset).attr('stop-color', color)
            }
            return `url(#${gradientId})`
        } else if (anchor && anchor[2] == 0 && anchor[3] == 0) {
            return 'transparent'
        } else if (paint.type == 'texture') {
            // 图片或纹理
            let texture = paint.texture
            let patternId = 'pattern' + (++counter)
            let patternNode = defs.append('pattern').attr('id', patternId).attr('patternUnits', 'userSpaceOnUse')
            if (params) {
                let transform = []
                if (params.scaleX && params.scaleY) {
                    transform.push(`scale(${params.scaleX}, ${params.scaleY})`)
                }
                if (params.rotation) {
                    let width = params.width || anchor[2]
                    let height = params.height || anchor[3]
                    transform.push(`rotate(${params.rotation}, ${width / 2}, ${height / 2})`)
                }
                if (params.tx != null && params.ty != null) {
                    transform.push(`translate(${params.tx}, ${params.ty})`)
                }
                if (transform.length > 0) {
                    patternNode.attr('patternTransform', transform.join(' '))
                }
            }
            loadImage(texture.imageData).then(img => {
                if (img) {
                    texturePattern(patternNode, img, texture, anchor)
                }
            })
            return `url(#${patternId})`
        } else if (paint.type == 'pattern') {
            // 图案
            let pattern = paint.pattern
            // let prst = pattern.prst
            let fgColor = pattern.fgColor.realColor
            let bgColor = pattern.bgColor.realColor
            let width = anchor[2], height = anchor[3]
            let imgCanvas = document.createElement('canvas')
            imgCanvas.width = width
            imgCanvas.height = height
            let imgCtx = imgCanvas.getContext('2d')
            imgCtx.imageSmoothingEnabled = true
            imgCtx.imageSmoothingQuality = 'high'
            let imgData = imgCtx.createImageData(width, height)
            let line = 0
            for (let i = 0; i < imgData.data.length; i += 4) {
                if (++line % 16 == 0) {
                    // 前景
                    imgData.data[i + 0] = (fgColor >> 16) & 255
                    imgData.data[i + 1] = (fgColor >> 8) & 255
                    imgData.data[i + 2] = (fgColor >> 0) & 255
                    imgData.data[i + 3] = (fgColor >> 24) & 255
                } else {
                    // 背景
                    imgData.data[i + 0] = (bgColor >> 16) & 255
                    imgData.data[i + 1] = (bgColor >> 8) & 255
                    imgData.data[i + 2] = (bgColor >> 0) & 255
                    imgData.data[i + 3] = (bgColor >> 24) & 255
                }
                if (i % 400 == 0) {
                    line += 2
                }
            }
            imgCtx.putImageData(imgData, 0, 0)
            let imgSrc = imgCanvas.toDataURL('image/png')
            let patternId = 'pattern' + (++counter)
            let patternNode = defs.append('pattern')
            patternNode.attr('id', patternId)
                .attr('width', width)
                .attr('height', height)
                .attr('patternUnits', 'userSpaceOnUse')
            patternNode.append('image')
                .attr('href', imgSrc)
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', width)
                .attr('height', height)
            if (params) {
                let transform = []
                if (params.scaleX && params.scaleY) {
                    transform.push(`scale(${params.scaleX},${params.scaleY})`)
                }
                if (transform.length > 0) {
                    patternNode.attr('patternTransform', transform.join(' '))
                }
            }
            return `url(#${patternId})`
        }
    }

    function texturePattern(patternNode, img, texture, anchor) {
        let width = anchor[2]
        let height = anchor[3]
        if (width < 1 && height < 1 || isNaN(width) || isNaN(height)) {
            width = img.width
            height = img.height
        }
        if (texture.alignment || !texture.stretch) {
            // 图片平铺
            width = img.width
            height = img.height
        }
        patternNode.attr('width', width).attr('height', height)
        let patternCanvas = document.createElement('canvas')
        patternCanvas.width = Math.max(1, width)
        patternCanvas.height = Math.max(1, height)
        let patternCtx = patternCanvas.getContext('2d')
        patternCtx.imageSmoothingEnabled = true
        patternCtx.imageSmoothingQuality = 'high'
        if (texture.alpha >= 0 && texture.alpha < 100000) {
            patternCtx.globalAlpha = texture.alpha / 100000
        }
        let imgInsets = null
        if (texture.insets) {
            let top = texture.insets[0] / 100000
            let left = texture.insets[1] / 100000
            let bottom = texture.insets[2] / 100000
            let right = texture.insets[3] / 100000
            let x = img.width * left
            let y = img.height * top
            let w = img.width * (1 - left - right)
            let h = img.height * (1 - top - bottom)
            imgInsets = [x, y, w, h]
        }
        if (texture.stretch) {
            let top = texture.stretch[0] / 100000
            let left = texture.stretch[1] / 100000
            let bottom = texture.stretch[2] / 100000
            let right = texture.stretch[3] / 100000
            let x = width * left
            let y = height * top
            let w = width * (1 - left - right)
            let h = height * (1 - top - bottom)
            if (imgInsets) {
                patternCtx.drawImage(img, imgInsets[0], imgInsets[1], imgInsets[2], imgInsets[3], x, y, w, h)
            } else {
                patternCtx.drawImage(img, x, y, w, h)
            }
        } else if (texture.alignment) {
            let x = 0, y = 0, scale = zoom
            if (texture.alignment == 'CENTER') {
                if (width > anchor[2] / scale) {
                    x = (width - anchor[2] / scale) / 2
                }
                if (height > anchor[3] / scale) {
                    y = (height - anchor[3] / scale) / 2
                }
            }
            if (!x && !y) {
                scale = Math.max(scale, 1)
            }
            patternCtx.drawImage(img, x, y, width, height, 0, 0, width * scale, height * scale)
        } else {
            if (imgInsets) {
                patternCtx.drawImage(img, imgInsets[0], imgInsets[1], imgInsets[2], imgInsets[3], 0, 0, width, height)
            } else {
                patternCtx.drawImage(img, 0, 0, width, height)
            }
        }
        if (texture.duoTone && texture.duoTone.length > 0 && texture.duoTonePrst) {
            try {
                // 重新着色
                let color = texture.duoTone[0].realColor
                let r = (color >> 16) & 255
                let g = (color >> 8) & 255
                let b = (color >> 0) & 255
                let imageData = patternCtx.getImageData(0, 0, patternCanvas.width, patternCanvas.height)
                let data = imageData.data
                for(var i = 0; i < data.length; i += 4) {
                    let gray = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255
                    // black / white
                    let prst = texture.duoTonePrst == 'white' ? 255 : 0
                    data[i] = gray * r + (1 - gray) * prst
                    data[i + 1] = gray * g + (1 - gray) * prst
                    data[i + 2] = gray * b + (1 - gray) * prst
                }
                patternCtx.putImageData(imageData, 0, 0)
            } catch(e) { /* empty */ }
        }
        // let mode = texture.alignment ? 'repeat' : 'no-repeat'
        let imgSrc = patternCanvas.toDataURL('image/png')
        patternNode.append('image')
            .attr('href', imgSrc)
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height)
    }

    function toColor(colorObj, defaultColor) {
        if (colorObj == null || (colorObj.color == null && colorObj.realColor == null)) {
            return defaultColor || 'transparent'
        }
        let color = colorObj.realColor != null ? colorObj.realColor : colorObj.color
        let r = (color >> 16) & 255
        let g = (color >> 8) & 255
        let b = (color >> 0) & 255
        let a = ((color >> 24) & 255) / 255
        if (colorObj.realColor == null) {
            if (colorObj.alpha != null && colorObj.alpha != -1) {
                if (colorObj.alpha > 1000) {
                    a = colorObj.alpha / 100000
                } else {
                    a = (colorObj.alpha > 0 && colorObj.alpha < 1) ? colorObj.alpha : colorObj.alpha / 255
                }
                a = Math.min(1, Math.max(0, a))
            }
            if (colorObj.lumMod && colorObj.lumMod > 0) {
                let value = colorObj.lumMod / 100000
                r = r * value
                g = g * value
                b = b * value
            }
            if (colorObj.lumOff && colorObj.lumOff > 0) {
                let value = colorObj.lumOff / 100000
                r += 255 * value
                g += 255 * value
                b += 255 * value
            }
        }
        return `rgba(${r}, ${g}, ${b}, ${a})`
    }

    function toColorValue(r, g, b, a) {
        a = (a == null ? 255 : a)
        return (a & 255) << 24 | (r & 255) << 16 | (g & 255) << 8 | (b & 255) << 0
    }

    function text(obj) {
        if (obj == null) {
            return null
        }
        let text = obj.text
        if (text != null) {
            return text
        }
        if (obj.children != null && obj.children.length > 0) {
            let textAll = ''
            for (let i = 0; i < obj.children.length; i++) {
                let p = obj.children[i]
                if (p.children == null) {
                    continue
                }
                let pText = ''
                for (let j = 0; j < p.children.length; j++) {
                    let r = p.children[j]
                    if (r.text == null) {
                        continue
                    }
                    pText += r.text
                }
                if (pText) {
                    textAll += (pText + '\n')
                }
            }
            if (textAll.length > 0) {
                textAll = textAll.substring(0, textAll.length - 1)
            }
            return textAll
        }
        return ''
    }

    function loadImage(src) {
        return new Promise(resolve => {
            if (!src) {
                resolve()
                return
            }
            let cacheKey
            if (src.length < 15) {
                cacheKey = src
            } else {
                cacheKey = src.length + '_' + src.substring(src.length - 15)
            }
            let img = imageCache[cacheKey]
            if (img == null) {
                img = new Image()
                let eqOrigin = src.startsWith('data:') || src.startsWith(document.location.origin) || (src.startsWith('//') && (document.location.protocol + src).startsWith(document.location.origin))
                if (!eqOrigin) {
                    img.crossOrigin = 'anonymous'
                }
                img.src = src
                img.onload = function() {
                    imageCache[cacheKey] = img
                    resolve(img)
                }
                img.onerror = function (e) {
                    resolve()
                    console.log('图片加载失败: ', src, e)
                }
            } else {
                resolve(img)
            }
        })
    }

    function calcPointList(page) {
        pointList = []
        recursion(page.children, c => {
            if (c.extInfo && c.extInfo.property && c.extInfo.property.anchor) {
                let point = scaleAnchor(c.point)
                if (!point) {
                    point = scaleAnchor(c.extInfo.property.anchor)
                }
                let _point
                if (point[2] < 0.1) {
                    let width = scaleValue((c.extInfo.property.strokeStyle || {}).lineWidth || 1)
                    let x = point[0] - width / 2
                    _point = { x: x, endX: x + width, y: point[1], endY: point[1] + point[3], sort: width + point[3], obj: c }
                } else if (point[3] < 0.1) {
                    let height = scaleValue((c.extInfo.property.strokeStyle || {}).lineWidth || 1)
                    let y = point[1] - height / 2
                    _point = { x: point[0], endX: point[0] + point[2], y: y, endY: y + height, sort: point[2] + height, obj: c }
                } else {
                    _point = { x: point[0], endX: point[0] + point[2], y: point[1], endY: point[1] + point[3], sort: point[2] + point[3], obj: c }
                }
                pointList.push(_point)
            }
        })
        pointList.sort((p1, p2) => p1.sort > p2.sort ? 1 : -1)
    }

    function removePoint() {
        if (currentPoint && currentPoint.obj && (!currentSelect || currentPoint.obj.id != currentSelect.id)) {
            let gNode = document.getElementById('g-' + currentPoint.obj.id)
            if (gNode) {
                gNode.style.cursor = null
                gNode.style.outline = null
            }
        }
        currentPoint = null
    }

    function showPoint(point) {
        removePoint()
        currentPoint = point
        let gNode = document.getElementById('g-' + currentPoint.obj.id)
        if (gNode && (!currentSelect || currentPoint.obj.id != currentSelect.id)) {
            gNode.style.cursor = 'move'
            gNode.style.outline = '1px dashed #777'
        }
    }

    function addElementEvent(gNode, elementObj) {
        let node = gNode.node()
        node.addEventListener('click', function (e) {
            if (currentPoint && currentSelect && currentPoint.obj.id == currentSelect.id) {
                if (!document.getElementById('move_element_operate')) {
                    addElementMoveScale(elementObj)
                }
                return
            }
            if (currentPoint && currentPoint.obj.id != elementObj.id && (currentPoint.obj.type == 'text' || currentPoint.obj.type == 'freeform')) {
                // 文本被遮挡处理
                let rId = null
                for (let i = 0; i < currentPoint.obj.children.length; i++) {
                    let p = currentPoint.obj.children[i]
                    for (let j = 0; j < p.children.length; j++) {
                        let r = p.children[j]
                        let rNode = document.getElementById(r.id)
                        let rect = rNode.getBoundingClientRect()
                        if (e.clientX >= rect.x && e.clientX <= rect.x + rect.width && e.clientY >= rect.y && e.clientY <= rect.y + rect.height) {
                            rId = r.id
                            if (r.text && r.text.trim()) {
                                break
                            }
                        }
                    }
                    if (rId) {
                        break
                    }
                }
                if (rId) {
                    editRunText(rId, currentPoint.obj)
                    e.cancelBubble = true
                    return
                }
            }
            if (currentPoint && currentPoint.obj.id != elementObj.id) {
                addElementMoveScale(elementObj)
            } else if (!currentPoint) {
                removeElementMoveScale()
            }
        })
        node.addEventListener('mousedown', function (e) {
            if (!currentPoint) {
                return
            }
            if (!currentSelect || currentPoint.obj.id != currentSelect.id) {
                addElementMoveScale(currentPoint.obj)
            }
            doElementMove(e, currentPoint.obj)
        })
    }

    function addRunTextEvent(rNode, textObj) {
        let rId = rNode.attr('id')
        let node = rNode.node()
        // node.addEventListener('mouseenter', function () {
        //     node.style.outline = '1px dashed #f35858'
        // })
        // node.addEventListener('mouseleave', function () {
        //     node.style.outline = null
        // })
        node.addEventListener('click', function (e) {
            editRunText(rId, textObj)
            e.cancelBubble = true
        })
    }

    function doElementMove(e, obj) {
        // 移动
        if (obj.type == 'tableColumn') {
            // table
            obj = idMap[idMap[obj.pid].pid]
        }
        if (!obj.point) {
            return
        }
        let gNode = document.getElementById('g-' + obj.id)
        if (!gNode) {
            return
        }
        let x = e.clientX
        let y = e.clientY
        let g = d3.select(gNode)
        let { flipX, flipY } = g.parent().getFlipXy()
        let lastTranslate = g.translate()
        let translateX = lastTranslate.x
        let translateY = lastTranslate.y
        let updateAnchor = (obj, tx, ty) => {
            let point = obj.point
            point[0] = point[0] + tx * flipX
            point[1] = point[1] + ty * flipY
            let anchor = obj.extInfo.property.anchor
            if (point !== anchor) {
                anchor[0] = anchor[0] + tx * (anchor[2] / point[2])
                anchor[1] = anchor[1] + ty * (anchor[3] / point[3])
            }
            let interiorAnchor = obj.extInfo.property.interiorAnchor
            if (interiorAnchor) {
                interiorAnchor[0] = interiorAnchor[0] + tx * (interiorAnchor[2] / point[2])
                interiorAnchor[1] = interiorAnchor[1] + ty * (interiorAnchor[3] / point[3])
            }
            if (obj.type == 'table') {
                let rows = obj.children || []
                for (let i = 0; i < rows.length; i++) {
                    let columns = rows[i].children || []
                    for (let j = 0; j < columns.length; j++) {
                        let columnAnchor = columns[j].extInfo.property.anchor
                        columnAnchor[0] = columnAnchor[0] + tx
                        columnAnchor[1] = columnAnchor[1] + ty
                    }
                }
            }
        }
        let rotate = g.rotate()
        let move_element_operate = document.getElementById('move_element_operate')
        let tx = 0, ty = 0
        let lastMoveX = +(g.attr('moveX') || 0)
        let lastMoveY = +(g.attr('moveY') || 0)
        document.onmousemove = function (e2) {
            tx = (e2.clientX - x) * flipX
            ty = (e2.clientY - y) * flipY
            if (move_element_operate) {
                move_element_operate.remove()
                move_element_operate = null
                currentSelect = null
            }
            if (rotate) {
                g.rotate(0)
            }
            g.translate(translateX + tx, translateY + ty)
        }
        let cursor = g.style('cursor')
        g.style('cursor', 'move')
        document.onmouseup = function (e2) {
            g.style('cursor', cursor)
            document.onmousemove = null
            document.onmouseup = null
            if (rotate) {
                g.rotate(rotate.rotate, rotate.x, rotate.y)
            }
            if (tx || ty) {
                const real_tx = tx / zoom
                const real_ty = ty / zoom
                updateAnchor(obj, real_tx, real_ty)
                if (obj != idMap[obj.id]) {
                    updateAnchor(idMap[obj.id], real_tx, real_ty)
                }
                g.attr('moveX', lastMoveX + tx)
                g.attr('moveY', lastMoveY + ty)
                // 重新渲染元素
                // $this.redrawElementWithId(obj.id)
                // 不重新渲染，重新计算元素位置
                page && calcPointList(page)
                if ($this.onchange) {
                    $this.onchange(page, 'move', obj, e2)
                }
            }
            setTimeout(() => addElementMoveScale(obj), 10)
        }
    }

    function doElementRotate(e, obj) {
        // 旋转
        if (obj.type == 'tableColumn') {
            // table
            obj = idMap[idMap[obj.pid].pid]
        }
        if (!obj.point) {
            return
        }
        let gNode = document.getElementById('g-' + obj.id)
        if (!gNode) {
            return
        }
        let g = d3.select(gNode)
        let { flipX, flipY } = g.parent().getFlipXy()
        let rotate = g.rotate()
        if (!rotate.rotate && !rotate.x) {
            let anchor = scaleAnchor(obj.extInfo?.property?.anchor ? obj.extInfo.property.anchor : obj.point)
            let interior = g.attr('interior')
            if (interior) {
                interior = JSON.parse(interior)
                anchor = [anchor[0] * interior.scaleX + interior.tx * zoom, anchor[1] * interior.scaleY + interior.ty * zoom, anchor[2] * interior.scaleX, anchor[3] * interior.scaleY]
            }
            let cx = anchor[0] + anchor[2] / 2
            let cy = anchor[1] + anchor[3] / 2
            rotate = { rotate: 0, x: cx, y: cy, interior: true }
        }
        let rect = gNode.getBoundingClientRect()
        let centerX = rect.x + rect.width / 2
        let centerY = rect.y + rect.height / 2
        let startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI - rotate.rotate
        let updateRotate = (obj, angle) => {
            obj.extInfo.property.rotation = angle
        }
        let angle = 0
        let move_rotate_span = document.createElement('span')
        move_rotate_span.id = 'move_rotate_span'
        move_rotate_span.style.fontSize = '14px'
        move_rotate_span.style.color = '#5f6063'
        move_rotate_span.style.position = 'fixed'
        move_rotate_span.style.left = e.clientX + 'px'
        move_rotate_span.style.top = e.clientY + 'px'
        move_rotate_span.style.margin = '-20px 0px 0px 12px'
        move_rotate_span.innerText = rotate.rotate.toFixed(0) + '°'
        document.body.appendChild(move_rotate_span)
        let move_element_operate = document.getElementById('move_element_operate')
        document.onmousemove = function (e2) {
            if (move_element_operate) {
                move_element_operate.remove()
                move_element_operate = null
                currentSelect = null
            }
            let endAngle = Math.atan2(e2.clientY - centerY, e2.clientX - centerX) * 180 / Math.PI
            angle = (endAngle - startAngle) % 360 * flipX
            angle = +(angle < 0 ? angle + 360 : angle).toFixed(0)
            g.rotate(angle, rotate.x, rotate.y)
            move_rotate_span.style.left = e2.clientX + 'px'
            move_rotate_span.style.top = e2.clientY + 'px'
            move_rotate_span.innerText = angle + '°'
        }
        document.onmouseup = function (e2) {
            document.onmousemove = null
            document.onmouseup = null
            move_rotate_span.remove()
            if (angle) {
                updateRotate(obj, angle)
                if (obj != idMap[obj.id]) {
                    updateRotate(idMap[obj.id], angle)
                }
                if (rotate.interior) {
                    // 重新渲染元素
                    $this.redrawElementWithId(obj.id)
                } else {
                    // 不重新渲染，重新计算元素位置
                    page && calcPointList(page)
                    setTimeout(() => addElementMoveScale(obj), 10)
                }
                if ($this.onchange) {
                    $this.onchange(page, 'rotate', obj, e2)
                }
            } else {
                setTimeout(() => addElementMoveScale(obj), 10)
            }
        }
    }

    function rotatePoint(pointX, pointY, centerX, centerY, angle) {
        angle = angle * Math.PI / 180
        let rotatedX = Math.cos(angle) * (pointX - centerX) - Math.sin(angle) * (pointY - centerY) + centerX
        let rotatedY = Math.sin(angle) * (pointX - centerX) + Math.cos(angle) * (pointY - centerY) + centerY
        return [rotatedX, rotatedY]
    }

    function addElementMoveScale(elementObj) {
        removeElementMoveScale()
        if (!elementObj) {
            return
        }
        if (!elementObj.point || elementObj.type == 'tableColumn') {
            return
        }
        let gNode = document.getElementById('g-' + elementObj.id)
        if (!gNode) {
            return
        }
        console.log('obj', elementObj)
        let g = d3.select(gNode)
        currentSelect = elementObj
        gNode.style.outline = '1px dashed #f35858'
        let isText = (elementObj.type == 'text' || elementObj.type == 'freeform') && elementObj.children && elementObj.children.length > 0
        if (isText) {
            let hasRs = false
            for (let i = 0; i < elementObj.children.length; i++) {
                if (elementObj.children[i].children && elementObj.children[i].children.length > 0) {
                    hasRs = true
                    break
                }
            }
            isText = hasRs
        }
        let svgNode = svg.node()
        let svgRect = svgNode.getClientRects()[0]
        let x = svgRect.x + elementObj.point[0] * zoom
        let y = svgRect.y + elementObj.point[1] * zoom
        let width = elementObj.point[2] * zoom
        let height = elementObj.point[3] * zoom
        let moveElements = [
            { left: '0px', top: '0px', width: '10px', height: '10px', margin: '-5px 0px 0px -5px', cursor: 'nwse-resize' },
            { left: width / 2 + 'px', top: '0px', width: '16px', height: '8px', margin: '-4px 0px 0px -8px', cursor: 'ns-resize' },
            { left: width + 'px', top: '0px', width: '10px', height: '10px', margin: '-5px 0px 0px -5px', cursor: 'nesw-resize' },
            { left: width + 'px', top: height / 2 + 'px', width: '8px', height: '16px', margin: '-8px 0px 0px -4px', cursor: 'ew-resize' },
            { left: width + 'px', top: height + 'px', width: '10px', height: '10px', margin: '-5px 0px 0px -5px', cursor: 'nwse-resize' },
            { left: width / 2 + 'px', top: height + 'px', width: '16px', height: '8px', margin: '-4px 0px 0px -8px', cursor: 'ns-resize' },
            { left: '0px', top: height + 'px', width: '10px', height: '10px', margin: '-5px 0px 0px -5px', cursor: 'nesw-resize' },
            { left: '0px', top: height / 2 + 'px', width: '8px', height: '16px', margin: '-8px 0px 0px -4px', cursor: 'ew-resize' }
        ]
        let div = document.createElement('div')
        div.id = 'move_element_operate'
        div.style.position = 'fixed'
        div.style.userSelect = 'none'
        div.style.pointerEvents = 'none'
        div.style.left = x + 'px'
        div.style.top = y + 'px'
        div.style.width = width + 'px'
        div.style.height = height + 'px'
        let rotate = g.rotate().rotate
        if (rotate) {
            div.style.transform = `rotate(${rotate}deg)`
        }
        for (let i = 0; i < moveElements.length; i++) {
            if (isText && (i == 1 || i == 5)) {
                continue
            }
            let obj = moveElements[i]
            let span = document.createElement('span')
            span.id = 'move_span_' + i
            span.style.pointerEvents = 'all'
            span.style.position = 'absolute'
            span.style.background = '#fff'
            span.style.borderRadius = '5px'
            span.style.border = '1px solid #a1a4ad'
            span.style.left = obj.left
            span.style.top = obj.top
            span.style.width = obj.width
            span.style.height = obj.height
            span.style.cursor = obj.cursor
            span.style.margin = obj.margin
            span.addEventListener('mousedown', function (e) {
                // 缩放
                doElementMoveScale(e, elementObj, i)
            })
            div.appendChild(span)
        }
        let img = document.createElement('img')
        img.id = 'move_rotate_img'
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAUCAYAAABvVQZ0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkNFRjkzREQyQUVBRDExRUE5RDkwQTZCNzUwQUEwQkI5IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkNFRjkzREQzQUVBRDExRUE5RDkwQTZCNzUwQUEwQkI5Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Q0VGOTNERDBBRUFEMTFFQTlEOTBBNkI3NTBBQTBCQjkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6Q0VGOTNERDFBRUFEMTFFQTlEOTBBNkI3NTBBQTBCQjkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6qKiSpAAACtElEQVR42pRUX2iSURQ/3/4Qpc6EHipKrdwcGOxlDCsI11gPbWt/zCnR2GqNELZRsJ4qG8Sgh+qlxmJREQS1VUTSgiLIoMXoUQVJ9segsIf56cypn06/zrG78WlEeuD3ne/cc+/vnnPuuZcTRREkYkbYEROIF1CEtLQe3/gvk4xfiERWnp/s6WtihHIoUSrWiZYC326d7h+AxaUAhMPhpsrKyl9yuTyFvjBiHjGHmEZ8+RcZx9L0m5qOViMhfA/Mg1KphHQ6DalUClQqFeh0OjAajdDd3Q0NDQ1TrAwf/0oTDQ4XTt6fvAsatRp2aXXA8zxEo9FVFPB4PDA2NgYKhQKsVivYbDYrznfhWnVhZFQzrqPTPFGlrLr26uUzOHTwACSSyc+tbe01w8Pnd3yandVrtdq2kZGL130+H8RiMXA4HMDqmp/msZa2ctQyxLbRUYe5Vq+3LCwsPrl0+YoTx6hmIkN2/M7tIzLZlscGgwHcbjeVYGeX2RKUklF0mxEqRBU7lDhiFZGmOSwDGuemp57eGBoatNbX14Pdbh/EDMalaYpsUYydHI9YYWTxAqzxfGjOZDKBy+UCPLxGttkfspnXznUymhxhZFEiQ18hWSIY/Ompq6sDr9cLHMftzyOjj4RQQCTZf3bdh8iw+glf/f5FjUYDwWCuVNvzGp/6rFgIgmBJp9c+ZLNZEaMSSTKZzDtU7Vj7vOv0X8Fbca73zFmTVlcLu/dUg2afHvr6B5o32qTYqHBnjiJbDoXEw43NonpvTU6TjU3cSf5SIuM6u044yzju6qOH93K3hTTZ7R1db8hfVuLDUH6qp/cBRnrz/duZH6TJpnHpRS/m3aKNNyG2sganRk+w3qSWEipKiIp2zTCCctZCKWavkb/oNAuam6JZZjpeMlkBYYJdtwSzc7X6LcAAZxVxcQ2YXyMAAAAASUVORK5CYII='
        img.style.pointerEvents = 'all'
        img.style.position = 'absolute'
        img.style.left = width + 'px'
        img.style.top = '0px'
        img.style.width = '20px'
        img.style.height = '20px'
        img.style.margin = '-15px 0px 0px 0px'
        img.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABWUlEQVQ4T6WT0U3DQAyGf/sGoBuQDcjp7p2wQTsBbNCOABMAE5BuwAjpe09XJqAjlAFyRq5yIUkRKuCXSIn92f79h/DPoGl9jLFIKS0BzAEU+l1EdgBqY8zaWnvQnLZtS+/96wgQQrgD8PLDUHsADwAeAbw556oeMCwWkQ8iqpn5NaVUikhJRLcT8KYHdGO/dwkbZp7rqMOCEMKq65xffwFCCE8AltrZGFNMi7sGEcBsAB0BdLdLAM/OOe00ihhjlVK6n7yunXP1UYMQguiTmW+stc1vLjsCiMhCT/MXgN75SkTW3ns95dmRJ+gVZmZrrVXgSWy327kxphmKfATEGGcpJS1SIQ/MvJhqkc+orvTe20zvjRRjLNu2bYjoItuXiBoRKYiozLZWBzJzlacYWVkhKSX1xPV3K6hGxpjVyQrTZN2161qJyJ6Idmpra636ZRQnf+PZ8neJn9q+rxFGGvPWAAAAAElFTkSuQmCC) 8 8,default'
        img.addEventListener('mousedown', function (e) {
            // 旋转
            doElementRotate(e, elementObj)
        })
        div.appendChild(img)
        document.body.appendChild(div)
        if ($this.onselect) {
            $this.onselect(page, elementObj)
        }
    }

    function removeElementMoveScale() {
        let gNode = currentSelect ? document.getElementById('g-' + currentSelect.id) : null
        if (gNode) {
            gNode.style.outline = null
        }
        currentSelect = null
        let element = document.getElementById('move_element_operate')
        element && element.remove()
        if ($this.onunselect) {
            $this.onunselect(page)
        }
    }

    function doElementMoveScale(e, obj, idx) {
        // 移动缩放
        if (obj.type == 'tableColumn') {
            // table
            obj = idMap[idMap[obj.pid].pid]
        }
        if (!obj.point) {
            return
        }
        let gNode = document.getElementById('g-' + obj.id)
        if (!gNode) {
            return
        }
        let x = obj.point[0] * zoom
        let y = obj.point[1] * zoom
        let width = obj.point[2] * zoom
        let height = obj.point[3] * zoom
        let clientX = e.clientX
        let clientY = e.clientY
        let g = d3.select(gNode)
        let lastScale = g.scale()
        let scaleX = lastScale.x
        let scaleY = lastScale.y
        let rect = gNode.getBoundingClientRect()
        let centerX = rect.x + rect.width / 2
        let centerY = rect.y + rect.height / 2
        let lastRotate = g.rotate()
        if (lastRotate.rotate) {
            let clientXY = rotatePoint(clientX, clientY, centerX, centerY, -lastRotate.rotate)
            clientX = clientXY[0]
            clientY = clientXY[1]
        }
        let lastTranslate = g.translate()
        let translateX = lastTranslate.x
        let translateY = lastTranslate.y
        let changeData = { tx: 0, ty: 0, scaleX: 1, scaleY: 1 }
        let changeElement = (tx, ty) => {
            let _scaleX = 1, _scaleY = 1
            let originalWidth = width / scaleX
            let originalHeight = height / scaleY
            let lastTx, originalX, newTx, newScaleX, originalTranslateX
            let lastTy, originalY, newTy, newScaleY, originalTranslateY
            switch (idx) {
                case 0:
                    // 左上角
                    _scaleX = (width - tx) / width
                    _scaleY = (height - ty) / height
                    if (_scaleX < 0.15 || _scaleY < 0.15) {
                        return false
                    }
                    changeData.tx = tx
                    changeData.ty = ty
                    changeData.scaleX = _scaleX
                    changeData.scaleY = _scaleY
                    // g.translate(translateX + tx + x * (1 - _scaleX), translateY + ty + y * (1 - _scaleY))
                    // g.scale(scaleX * _scaleX, scaleY * _scaleY)
                    lastTx = originalWidth - width
                    originalX = x - lastTx
                    newTx = x - originalX + tx
                    newScaleX = (originalWidth - newTx) / originalWidth
                    originalTranslateX = +(g.attr('moveX') || 0) * newScaleX
                    lastTy = originalHeight - height
                    originalY = y - lastTy
                    newTy = y - originalY + ty
                    newScaleY = (originalHeight - newTy) / originalHeight
                    originalTranslateY = +(g.attr('moveY') || 0) * newScaleY
                    g.translate(originalTranslateX + newTx + originalX * (1 - newScaleX), originalTranslateY + newTy + originalY * (1 - newScaleY))
                    g.scale(newScaleX, newScaleY)
                    break
                case 1:
                    // 上
                    _scaleY = (height - ty) / height
                    if (_scaleY < 0.15) {
                        return false
                    }
                    changeData.ty = ty
                    changeData.scaleY = _scaleY
                    // g.translate(translateX, translateY + ty + y * (1 - _scaleY))
                    // g.scale(scaleX, scaleY * _scaleY)
                    lastTy = originalHeight - height
                    originalY = y - lastTy
                    newTy = y - originalY + ty
                    newScaleY = (originalHeight - newTy) / originalHeight
                    originalTranslateY = +(g.attr('moveY') || 0) * newScaleY
                    g.translate(translateX, originalTranslateY + newTy + originalY * (1 - newScaleY))
                    g.scale(scaleX, newScaleY)
                    break
                case 2:
                    // 右上角
                    _scaleX = (width + tx) / width
                    _scaleY = (height - ty) / height
                    if (_scaleX < 0.15 || _scaleY < 0.15) {
                        return false
                    }
                    changeData.ty = ty
                    changeData.scaleX = _scaleX
                    changeData.scaleY = _scaleY
                    // g.translate(translateX + x * (1 - _scaleX), translateY + ty + y * (1 - _scaleY))
                    // g.scale(scaleX * _scaleX, scaleY * _scaleY)
                    lastTx = width - originalWidth
                    originalX = x
                    newTx = lastTx + tx
                    newScaleX = (originalWidth + newTx) / originalWidth
                    originalTranslateX = +(g.attr('moveX') || 0) * newScaleX
                    lastTy = originalHeight - height
                    originalY = y - lastTy
                    newTy = y - originalY + ty
                    newScaleY = (originalHeight - newTy) / originalHeight
                    originalTranslateY = +(g.attr('moveY') || 0) * newScaleY
                    g.translate(originalTranslateX + originalX * (1 - newScaleX), originalTranslateY + newTy + originalY * (1 - newScaleY))
                    g.scale(newScaleX, newScaleY)
                    break
                case 3:
                    // 右
                    _scaleX = (width + tx) / width
                    if (_scaleX < 0.15) {
                        return false
                    }
                    changeData.scaleX = _scaleX
                    // g.translate(translateX + x * (1 - _scaleX), translateY)
                    // g.scale(scaleX * _scaleX, scaleY)
                    lastTx = width - originalWidth
                    originalX = x
                    newTx = lastTx + tx
                    newScaleX = (originalWidth + newTx) / originalWidth
                    originalTranslateX = +(g.attr('moveX') || 0) * newScaleX
                    g.translate(originalTranslateX + originalX * (1 - newScaleX), translateY)
                    g.scale(newScaleX, scaleY)
                    break
                case 4:
                    // 右下角
                    _scaleX = (width + tx) / width
                    _scaleY = (height + ty) / height
                    if (_scaleX < 0.15 || _scaleY < 0.15) {
                        return false
                    }
                    changeData.scaleX = _scaleX
                    changeData.scaleY = _scaleY
                    // g.translate(translateX + x * (1 - _scaleX), translateY + y * (1 - _scaleY))
                    // g.scale(scaleX * _scaleX, scaleY * _scaleY)
                    lastTx = width - originalWidth
                    originalX = x
                    newTx = lastTx + tx
                    newScaleX = (originalWidth + newTx) / originalWidth
                    originalTranslateX = +(g.attr('moveX') || 0) * newScaleX
                    lastTy = height - originalHeight
                    originalY = y
                    newTy = lastTy + ty
                    newScaleY = (originalHeight + newTy) / originalHeight
                    originalTranslateY = +(g.attr('moveY') || 0) * newScaleY
                    g.translate(originalTranslateX + originalX * (1 - newScaleX), originalTranslateY + originalY * (1 - newScaleY))
                    g.scale(newScaleX, newScaleY)
                    break
                case 5:
                    // 下
                    _scaleY = (height + ty) / height
                    if (_scaleY < 0.15) {
                        return false
                    }
                    changeData.scaleY = _scaleY
                    // g.translate(translateX, translateY + y * (1 - _scaleY))
                    // g.scale(scaleX, scaleY * _scaleY)
                    lastTy = height - originalHeight
                    originalY = y
                    newTy = lastTy + ty
                    newScaleY = (originalHeight + newTy) / originalHeight
                    originalTranslateY = +(g.attr('moveY') || 0) * newScaleY
                    g.translate(translateX, originalTranslateY + originalY * (1 - newScaleY))
                    g.scale(scaleX, newScaleY)
                    break
                case 6:
                    // 左下角
                    _scaleX = (width - tx) / width
                    _scaleY = (height + ty) / height
                    if (_scaleX < 0.15 || _scaleY < 0.15) {
                        return false
                    }
                    changeData.scaleX = _scaleX
                    changeData.scaleY = _scaleY
                    changeData.tx = tx
                    // g.translate(translateX + tx + x * (1 - _scaleX), translateY + y * (1 - _scaleY))
                    // g.scale(scaleX * _scaleX, scaleY * _scaleY)
                    lastTx = originalWidth - width
                    originalX = x - lastTx
                    newTx = x - originalX + tx
                    newScaleX = (originalWidth - newTx) / originalWidth
                    originalTranslateX = +(g.attr('moveX') || 0) * newScaleX
                    lastTy = height - originalHeight
                    originalY = y
                    newTy = lastTy + ty
                    newScaleY = (originalHeight + newTy) / originalHeight
                    originalTranslateY = +(g.attr('moveY') || 0) * newScaleY
                    g.translate(originalTranslateX + newTx + originalX * (1 - newScaleX), originalTranslateY + originalY * (1 - newScaleY))
                    g.scale(newScaleX, newScaleY)
                    break
                case 7:
                    // 左
                    _scaleX = (width - tx) / width
                    if (_scaleX < 0.15) {
                        return false
                    }
                    changeData.tx = tx
                    changeData.scaleX = _scaleX
                    // g.translate(translateX + tx + x * (1 - _scaleX), translateY)
                    // g.scale(scaleX * _scaleX, scaleY)
                    lastTx = originalWidth - width
                    originalX = x - lastTx
                    newTx = x - originalX + tx
                    newScaleX = (originalWidth - newTx) / originalWidth
                    originalTranslateX = +(g.attr('moveX') || 0) * newScaleX
                    g.translate(originalTranslateX + newTx + originalX * (1 - newScaleX), translateY)
                    g.scale(newScaleX, scaleY)
                    break
            }
            return true
        }
        let updateElement = (obj) => {
            let _tx = changeData.tx / zoom
            let _ty = changeData.ty / zoom
            let point = obj.point
            point[0] = point[0] + _tx
            point[1] = point[1] + _ty
            let _width = point[2]
            let _height = point[3]
            point[2] = point[2] * changeData.scaleX
            point[3] = point[3] * changeData.scaleY
            let anchor = obj.extInfo.property.anchor
            if (point !== anchor) {
                anchor[0] = anchor[0] + _tx * (anchor[2] / _width)
                anchor[1] = anchor[1] + _ty * (anchor[3] / _height)
                anchor[2] = anchor[2] * changeData.scaleX
                anchor[3] = anchor[3] * changeData.scaleY
            }
            let interiorAnchor = obj.extInfo.property.interiorAnchor
            if (interiorAnchor) {
                interiorAnchor[0] = interiorAnchor[0] + _tx * (interiorAnchor[2] / point[2])
                interiorAnchor[1] = interiorAnchor[1] + _ty * (interiorAnchor[3] / point[3])
            }
            if (obj.type == 'table') {
                let rows = obj.children || []
                for (let i = 0; i < rows.length; i++) {
                    let row_property = rows[i].extInfo.property
                    row_property.rowHeight *= changeData.scaleY
                    let columns = rows[i].children || []
                    for (let j = 0; j < columns.length; j++) {
                        let columns_property = columns[j].extInfo.property
                        columns_property.columnWidth *= changeData.scaleX
                        let columnAnchor = columns[j].extInfo.property.anchor
                        columnAnchor[0] = anchor[0] + columns_property.columnWidth * j + (j + 1) * changeData.scaleX
                        columnAnchor[1] = anchor[1] + row_property.rowHeight * i + (i + 1) * changeData.scaleY
                        columnAnchor[2] = columns_property.columnWidth
                        columnAnchor[3] = row_property.rowHeight
                    }
                }
            }
        }
        let move_element_operate = document.getElementById('move_element_operate')
        let tx = 0, ty = 0
        document.onmousemove = function (e2) {
            let clientX2 = e2.clientX
            let clientY2 = e2.clientY
            if (lastRotate.rotate) {
                let clientXY2 = rotatePoint(clientX2, clientY2, centerX, centerY, -lastRotate.rotate)
                clientX2 = clientXY2[0]
                clientY2 = clientXY2[1]
            }
            tx = clientX2 - clientX
            ty = clientY2 - clientY
            if (move_element_operate) {
                move_element_operate.remove()
                move_element_operate = null
                currentSelect = null
            }
            let change = changeElement(tx, ty)
            if (!change) {
                e.preventDefault()
            }
        }
        document.onmouseup = function (e2) {
            document.onmousemove = null
            document.onmouseup = null
            if (tx || ty) {
                updateElement(obj)
                if (obj != idMap[obj.id]) {
                    updateElement(idMap[obj.id])
                }
                // 重新渲染
                // $this.drawPptx(pptx, pageIndex, obj.id)
                // 重新渲染元素
                $this.redrawElementWithId(obj.id)
                if ($this.onchange) {
                    $this.onchange(page, 'scale', obj, e2)
                }
            } else {
                addElementMoveScale(obj)
            }
        }
    }

    function editRunText(rId, textObj) {
        if (mode != 'edit') {
            return
        }
        let obj = idMap[rId]
        if (obj == null) {
            // ignore master element
            return
        }
        addElementMoveScale(textObj)
        let rect = null
        let nodeStyle = null
        let nodes = document.querySelectorAll(`tspan[id='${rId}']`)
        for (let i = 0; i < nodes.length; i++) {
            let _rect = nodes[i].getBoundingClientRect()
            if (_rect.width == 0 || _rect.height == 0) {
                continue
            }
            if (rect == null) {
                rect = { x: _rect.x, y: _rect.y, endX: _rect.x + _rect.width, endY: _rect.y + _rect.height }
                nodeStyle = window.getComputedStyle(nodes[i])
            } else {
                rect.x = Math.min(rect.x, _rect.x)
                rect.y = Math.min(rect.y, _rect.y)
                rect.endX = Math.max(rect.endX, _rect.x + _rect.width)
                rect.endY = Math.max(rect.endY, _rect.y + _rect.height)
            }
        }
        if (rect == null) {
            return
        }
        rect.width = rect.endX - rect.x
        rect.height = rect.endY - rect.y
        let fontSize = +nodeStyle.fontSize.replace('px', '')
        let textarea = document.getElementById('textarea_' + rId)
        if (textarea) {
            textarea.remove()
        }
        textarea = document.createElement('textarea')
        textarea.id = 'textarea_' + rId
        textarea.style.position = 'absolute'
        textarea.style.background = 'none'
        textarea.style.border = 'none'
        textarea.style.padding = '0'
        textarea.style.margin = '0'
        textarea.style.resize = 'none'
        textarea.style.overflow = 'hidden'
        textarea.style.outline = 'none'
        textarea.style.zIndex = 999
        // textarea.style.outline = '1px dashed #f35858'
        let scrollY = window.scrollY || document.documentElement.scrollTop
        let scrollX = window.scrollX || document.documentElement.scrollLeft
        textarea.style.left = (rect.x + scrollX) + 'px'
        textarea.style.top = (rect.y + scrollY) + 'px'
        let isMultiLine = rect.height >= fontSize * 2
        let textWordWrap = textObj.extInfo.property.textWordWrap ?? true
        if (isMultiLine) {
            textarea.style.width = rect.width + 'px'
            textarea.style.height = (rect.height + fontSize * 2) + 'px'
        } else {
            textarea.style.width = (rect.width + fontSize * 2) + 'px'
            textarea.style.height = rect.height + 'px'
        }
        let rotation = (textObj.extInfo.property || {}).rotation
        if (rotation) {
            textarea.style.transformOrigin = 'center'
            textarea.style.transform = 'rotate(' + rotation + 'deg)'
        }
        if (nodeStyle.fill && nodeStyle.fill.startsWith('rgb')) {
            textarea.style.color = nodeStyle.fill
        }
        textarea.style.font = nodeStyle.font
        textarea.style.fontSize = fontSize + 'px'
        textarea.value = obj.text
        nodes.forEach(s => s.style.visibility = 'hidden')
        document.body.appendChild(textarea)
        textarea.addEventListener('blur', function () {
            if (obj.text == textarea.value) {
                textarea.remove()
                nodes.forEach(s => s.style.visibility = null)
                return
            }
            obj.text = textarea.value
            recursion(textObj.children, c => {
                if (c.id == rId) {
                    c.text = obj.text
                }
            })
            textarea.remove()
            let gNode = document.getElementById('g-' + textObj.id)
            let g = d3.select(gNode)
            drawTextWithG(g, textObj)
            if ($this.onchange) {
                $this.onchange(textObj)
            }
        })
        textarea.addEventListener('input', function () {
            if (textarea.scrollHeight > textarea.clientHeight) {
                if (isMultiLine || textWordWrap) {
                    textarea.style.height = (textarea.scrollHeight + fontSize * 2) + 'px'
                } else {
                    textarea.style.width = (textarea.clientWidth + fontSize * 2) + 'px'
                }
            }
        })
        textarea.focus()
    }

    this.idMap = idMap
    this.recursion = recursion
    this.drawGeometry = drawGeometry
    this.drawElement = drawElement
    this.toPaint = toPaint
    this.toColor = toColor
    this.toColorValue = toColorValue
    this.loadImage = loadImage
    this.text = text

    d3.addEventListener('document', 'mousemove', function(event) {
        if (!pptx) {
            removePoint()
            return
        }
        let svgNode = svg.node()
        let svgRect = svgNode.getClientRects()[0]
        if (!svgRect) {
            return
        }
        let clientX = event.clientX
        let clientY = event.clientY
        if (!(clientX >= svgRect.x && clientX <= svgRect.x + svgRect.width && clientY >= svgRect.y && clientY <= svgRect.y + svgRect.height)) {
            removePoint()
            return
        }
        let offsetX = clientX - svgRect.x
        let offsetY = clientY - svgRect.y
        mTimer && clearTimeout(mTimer)
        mTimer = setTimeout(() => {
            let newPointList = []
            for (let i = 0; i < pointList.length; i++) {
                let point = pointList[i]
                if (offsetX >= point.x && offsetX <= point.endX && offsetY >= point.y && offsetY <= point.endY) {
                    // if (currentPoint == point) return
                    // showPoint(point)
                    // return
                    newPointList.push(point)
                }
            }
            if (newPointList.length > 0) {
                newPointList.sort((p1, p2) => {
                    let text1 = p1.obj.type == 'text' || p1.obj.type == 'freeform'
                    let text2 = p2.obj.type == 'text' || p2.obj.type == 'freeform'
                    if (!text1 && !text2) {
                        return 0
                    }
                    let s1 = text(p1.obj)
                    let s2 = text(p2.obj)
                    if (s1 && s2) {
                        return 0
                    }
                    if (s1) {
                        return -1
                    }
                    if (s2) {
                        return 1
                    }
                    return 0
                })
                showPoint(newPointList[0])
            } else {
                removePoint()
            }
        }, 10)
    })
    d3.addEventListener('document', 'keydown', function (event) {
        if (!currentPoint) {
            return
        }
        let obj = currentPoint.obj
        if (!obj.point || obj.type == 'tableColumn') {
            return
        }
        let gNode = document.getElementById('g-' + obj.id)
        if (!gNode) {
            return
        }
        if (event.keyCode == 46) {
            recursion(page.children, element => {
                if (obj.id == element.id) {
                    const children = element.pid ? idMap[element.pid].children : page.children
                    for (let i = 0; i < children.length; i++) {
                        if (children[i].id == element.id) {
                            children.splice(i, 1)
                            delete idMap[obj.id]
                            gNode.remove()
                            currentPoint = null
                            removeElementMoveScale()
                            calcPointList(page)
                            if ($this.onchange) {
                                $this.onchange(page, 'delete', obj, event)
                            }
                            break
                        }
                    }
                }
            })
        }
    })
    d3.addEventListener('window', 'scroll', function() {
        removePoint()
        removeElementMoveScale()
    })
    d3.addEventListener('window', 'resize', function() {
        removePoint()
        removeElementMoveScale()
        page && calcPointList(page)
    })
}

// export { D3Element, d3, Ppt2Svg }