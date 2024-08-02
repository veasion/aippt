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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const $this = this

    const svg = d3.select((typeof _svg == 'string') ? ('#' + _svg) : _svg)
                .attr('width', svgWidth || 960)
                .attr('height', svgHeight || 540)

    this.drawPptx = (pptxObj, pageIdx) => {
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
        if (property.rotation) {
            // 旋转
            transform.push(`rotate(${property.rotation}, ${cx}, ${cy})`)
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
            let lineSpacing = Math.max((p_property.lineSpacing || 100) / 100, 1)
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
        } else {
            property.fillStyle = { 'type': 'texture', texture: { 'imageData': property.image, insets: property.clipping } }
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
                let fill = toPaint({ 'type': 'texture', texture: { 'imageData': imgSrc } }, anchor)
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
        if (texture.alignment) {
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
        if (currentPoint && currentPoint.obj) {
            let gNode = document.getElementById('g-' + currentPoint.obj.id)
            if (gNode) {
                gNode.style.outline = null
            }
        }
        currentPoint = null
    }

    function showPoint(point) {
        removePoint()
        currentPoint = point
        let gNode = document.getElementById('g-' + currentPoint.obj.id)
        if (gNode) {
            gNode.style.outline = '1px dashed #f35858'
        }
    }

    function addElementEvent(gNode, elementObj) {
        let node = gNode.node()
        node.addEventListener('click', function (e) {
            if (currentPoint && currentPoint.obj.id != elementObj.id && currentPoint.obj.type == 'text') {
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
                }
            }
        })
        node.addEventListener('mousedown', function (e1) {
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
            let x = e1.clientX
            let y = e1.clientY
            let g = d3.select(gNode)
            let updateAnchor = (obj, tx, ty) => {
                let point = obj.point
                point[0] = point[0] + tx
                point[1] = point[1] + ty
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
            let tx = 0, ty = 0
            document.onmousemove = function (e2) {
                tx = e2.clientX - x
                ty = e2.clientY - y
                g.attr('transform', `translate(${tx}, ${ty})`)
            }
            document.onmouseup = function (e) {
                document.onmousemove = null
                document.onmouseup = null
                if (tx || ty) {
                    const real_tx = tx / zoom
                    const real_ty = ty / zoom
                    updateAnchor(obj, real_tx, real_ty)
                    if (obj != idMap[obj.id]) {
                        updateAnchor(idMap[obj.id], real_tx, real_ty)
                    }
                    $this.drawPptx(pptx, pageIndex)
                }
            }
        })
    }

    function addRunTextEvent(rNode, textObj) {
        let rId = rNode.attr('id')
        let node = rNode.node()
        node.addEventListener('mouseenter', function () {
            node.style.outline = '1px dashed #f35858'
        })
        node.addEventListener('mouseleave', function () {
            node.style.outline = null
        })
        // dblclick
        node.addEventListener('click', function (e) {
            editRunText(rId, textObj)
            e.cancelBubble = true
        })
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
        console.log('text edit', obj)
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
        textarea.style.outline = '1px dashed #f35858'
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
        if (event.keyCode == 46 && confirm(`确认删除 ${obj.type} 元素吗？`)) {
            recursion(page.children, element => {
                if (obj.id == element.id) {
                    const children = element.pid ? idMap[element.pid].children : page.children
                    for (let i = 0; i < children.length; i++) {
                        if (children[i].id == element.id) {
                            children.splice(i, 1)
                            delete idMap[obj.id]
                            gNode.remove()
                            currentPoint = null
                            calcPointList(page)
                            break
                        }
                    }
                }
            })
        }
    })
    d3.addEventListener('window', 'scroll', function() {
        removePoint()
    })
    d3.addEventListener('window', 'resize', function() {
        removePoint()
        page && calcPointList(page)
    })
}

// export { D3Element, d3, Ppt2Svg }