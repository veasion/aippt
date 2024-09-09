async function drawChart(chart, anchor, canvas, ctx) {
    if (!canvas) {
        canvas = document.createElement('canvas')
        let width = anchor[2]
        let height = anchor[3]
        canvas.width = width * 2
        canvas.height = height * 2
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'
        let ctx = canvas.getContext('2d')
        ctx.scale(2, 2)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
    }
    if (!ctx) {
        ctx = canvas.getContext('2d')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    let title = chart.title
    let legend = chart.legend
    let chartData = chart.chartData[0]
    let chartType = chartData.chartType
    if (chartType == 'bar') {
        // 柱状图、条形图
        let type = chartData.extInfo.type
        if (type == 'bar') {
            // 条形图
            await drawBarChartWithBar(title, chartData, legend, anchor, canvas, ctx)
        } else {
            // 柱状图
            await drawBarChartWithCol(title, chartData, legend, anchor, canvas, ctx)
        }
    } else if (chartType == 'pie' || chartType == 'doughnut') {
        // 饼图、圆环图
        await drawPieChart(title, chartData, legend, anchor, canvas, ctx)
    } else if (chartType == 'line') {
        // 折线图
        await drawLineChart(title, chartData, legend, anchor, canvas, ctx)
    } else {
        // 其他: 暂不支持
        await drawRect(ctx, {
            strokeStyle: {
                lineWidth: 0.5,
                paint: { type: 'color', color: { color: -2500135 } }
            },
            anchor: [anchor[0] + 0.5, anchor[1] + 0.5, anchor[2] - 1, anchor[3] - 1]
        })
        let str = '该图表暂不支持渲染'
        ctx.font = `${Math.min(anchor[2] * 0.056, 16)}px 等线`
        ctx.fillStyle = 'rgb(153, 153, 153)'
        let textWidth = ctx.measureText(str).width
        ctx.fillText(str, anchor[0] + anchor[2] / 2 - textWidth / 2, anchor[1] + anchor[3] / 2 - 8)
    }
    return canvas
}

async function drawBarChartWithBar(title, chartData, legend, anchor, canvas, ctx) {
    if (title) {
        ctx.font = `${Math.min(anchor[3] * 0.064, 18.5)}px 等线`
        ctx.fillStyle = 'rgb(89, 89, 89)'
        let textWidth = ctx.measureText(title).width
        ctx.fillText(title, anchor[0] + anchor[2] / 2 - textWidth / 2, anchor[1] + anchor[3] * 0.06)
    }
    let extInfo = chartData.extInfo
    let series = chartData.series
    let categoryAxis = chartData.categoryAxis
    let valueAxes = chartData.valueAxes && chartData.valueAxes.length > 0 ? chartData.valueAxes[0] : null
    let minValue = 0, maxValue = 0
    for (let i = 0; i < series.length; i++) {
        minValue = Math.min(minValue, ...series[i].value.data)
        maxValue = Math.max(maxValue, ...series[i].value.data)
    }
    ctx.lineWidth = 0.5
    ctx.font = `${Math.min(anchor[2] * 0.048, 14)}px 等线`
    ctx.fillStyle = 'rgb(89, 89, 89)'
    ctx.strokeStyle = 'rgb(217, 217, 217)'
    let categorys = series[0].category.data
    let maxCw = ctx.measureText('00').width
    for (let i = 0; i < categorys.length; i++) {
        let w = ctx.measureText(categorys[i] + '0').width
        if (w > maxCw) {
            maxCw = w
        }
    }
    let sGap = valueAxes && !valueAxes.deleted ? maxCw : anchor[2] * 0.15
    let x = anchor[0] + sGap
    let xWidth = anchor[2] - sGap - anchor[2] * 0.04
    let startY = title ? anchor[3] * 0.12 : anchor[3] * 0.05
    let y = anchor[1] + startY
    let yHeight = anchor[3] - startY - anchor[3] * 0.15
    let minTicks = xWidth / 10 > 20 ? 11 : 6
    let ticks = calculateTicks(minValue, maxValue, minTicks, 11)
    let xGap = xWidth / (ticks.length - 1)
    ctx.beginPath()
    for (let i = 0; i < ticks.length; i++) {
        // x轴数值
        if (valueAxes && !valueAxes.deleted) {
            ctx.textAlign = 'center'
            let v = ticks[i]
            let vs = v.toString()
            if (vs.indexOf('.') > -1 && vs.split('.')[1].length > 1) {
                vs = v.toFixed(1)
            }
            ctx.fillText(vs, x, y + yHeight + anchor[3] * 0.05)
            ctx.textAlign = 'start'
        }
        if (extInfo.majorGridlines == 'true') {
            // 网格线
            ctx.moveTo(x, y)
            ctx.lineTo(x, y + yHeight)
        }
        x += xGap
    }
    ctx.stroke()
    let yGap = anchor[3] * 0.04 // y开始
    y += yGap
    x = anchor[0] + sGap
    let vGap = anchor[3] * 0.015 // 柱子间距
    let catGap = vGap * 5 // 类目间距
    let categoryHeight = (yHeight - catGap * (categorys.length - 1) - yGap * 2) / categorys.length
    let vHeight = (categoryHeight - vGap * (series.length - 1)) / series.length
    // 绘制类目和柱状图
    for (let i = 0; i < categorys.length; i++) {
        if (categoryAxis && !categoryAxis.deleted) {
            ctx.fillStyle = 'rgb(89, 89, 89)'
            let _cy = (categoryHeight + catGap) * i + categoryHeight / 2 + 6
            ctx.textAlign = 'right'
            ctx.fillText(categorys[categorys.length - 1 - i], x - 4, y + _cy)
            ctx.textAlign = 'start'
        }
        for (let j = 0; j < series.length; j++) {
            let seriesData = series[series.length - 1 - j]
            let valueData = seriesData.value.data
            let vWidth = (valueData[valueData.length - 1 - i] / ticks[ticks.length - 1]) * xWidth
            let _x = x
            let _y = y + (categoryHeight + catGap) * i + (vHeight + vGap) * j
            let _anchor = [_x, _y, vWidth, vHeight]
            // 柱状图
            await drawRect(ctx, {
                fillStyle: seriesData.property.fillStyle,
                strokeStyle: seriesData.property.strokeStyle,
                anchor: _anchor
            })
        }
    }
    if (legend) {
        // 绘制v标签标识
        x = anchor[0] + sGap
        let vTexts = []
        let vTextWidth = 0
        for (let i = 0; i < series.length; i++) {
            let s = series[i].text.data[0]
            vTexts.push(s)
            vTextWidth += ctx.measureText(s).width
        }
        vGap = anchor[3] * 0.03
        let _iw = Math.min(anchor[2] * 0.028, 15)
        let _y = y + yHeight + anchor[3] * 0.1
        let _x = x + xWidth / 2 - (vTextWidth + vGap * (vTexts.length - 1) + (_iw * 1.25) * vTexts.length) / 2
        for (let i = 0; i < vTexts.length; i++) {
            await drawRect(ctx, {
                fillStyle: series[series.length - 1 - i].property.fillStyle,
                strokeStyle: series[series.length - 1 - i].property.strokeStyle,
                anchor: [_x, _y - _iw, _iw, _iw]
            })
            _x += (_iw * 1.25)
            ctx.fillStyle = 'rgb(89, 89, 89)'
            let str = vTexts[vTexts.length - 1 - i]
            ctx.fillText(str, _x, _y)
            _x += ctx.measureText(str).width
            _x += vGap
        }
    }
}

async function drawBarChartWithCol(title, chartData, legend, anchor, canvas, ctx) {
    if (title) {
        ctx.font = `${Math.min(anchor[3] * 0.07, 18.5)}px 等线`
        ctx.fillStyle = 'rgb(89, 89, 89)'
        let textWidth = ctx.measureText(title).width
        ctx.fillText(title, anchor[0] + anchor[2] / 2 - textWidth / 2, anchor[1] + anchor[3] * 0.06)
    }
    let extInfo = chartData.extInfo
    let series = chartData.series
    let categoryAxis = chartData.categoryAxis
    let valueAxes = chartData.valueAxes && chartData.valueAxes.length > 0 ? chartData.valueAxes[0] : null
    let minValue = 0, maxValue = 0
    for (let i = 0; i < series.length; i++) {
        minValue = Math.min(minValue, ...series[i].value.data)
        maxValue = Math.max(maxValue, ...series[i].value.data)
    }
    ctx.lineWidth = 0.5
    ctx.font = `${Math.min(anchor[3] * 0.06, 14)}px 等线`
    ctx.fillStyle = 'rgb(89, 89, 89)'
    ctx.strokeStyle = 'rgb(217, 217, 217)'
    let startY = title ? anchor[3] * 0.12 : anchor[3] * 0.05
    let y = anchor[1] + startY
    let yHeight = anchor[3] - startY - anchor[3] * 0.15
    let mixTicks = yHeight / 10 > 20 ? 11 : 6
    let ticks = calculateTicks(minValue, maxValue, mixTicks, 11)
    let xGap = ctx.measureText(ticks[ticks.length - 1] + '00').width
    let x = anchor[0] + xGap
    let xWidth = anchor[2] - xGap * 1.5
    let yGap = yHeight / (ticks.length - 1)
    ctx.beginPath()
    for (let i = 0; i < ticks.length; i++) {
        if (valueAxes && !valueAxes.deleted) {
            // y轴数值
            ctx.textAlign = 'right'
            let v = ticks[ticks.length - 1 - i]
            let vs = v.toString()
            if (vs.indexOf('.') > -1 && vs.split('.')[1].length > 1) {
                vs = v.toFixed(1)
            }
            ctx.fillText(vs, x - 4, y + 6)
            ctx.textAlign = 'start'
        }
        if (extInfo.majorGridlines == 'true') {
            // 网格线
            ctx.moveTo(x, y)
            ctx.lineTo(x + xWidth, y)
        }
        y += yGap
    }
    ctx.stroke()
    x += xGap
    y -= yGap
    let vGap = anchor[2] * 0.01 // 柱子间距
    let catGap = vGap * 6 // 类目间距
    let categorys = series[0].category.data
    let categoryWidth = (xWidth - catGap * (categorys.length - 1) - xGap * 1.5) / categorys.length
    let vWidth = (categoryWidth - vGap * (series.length - 1)) / series.length
    // 绘制类目和柱状图
    for (let i = 0; i < categorys.length; i++) {
        if (categoryAxis && !categoryAxis.deleted) {
            let _cx = (categoryWidth + catGap) * i + categoryWidth / 2 - ctx.measureText(categorys[i]).width / 2
            ctx.fillStyle = 'rgb(89, 89, 89)'
            ctx.fillText(categorys[i], x + _cx, y + anchor[3] * 0.055)
        }
        for (let j = 0; j < series.length; j++) {
            let vHeight = (series[j].value.data[i] / ticks[ticks.length - 1]) * yHeight
            let _x = x + (categoryWidth + catGap) * i + (vWidth + vGap) * j
            let _y = y - vHeight
            let _anchor = [_x, _y, vWidth, vHeight]
            // 柱状图
            await drawRect(ctx, {
                fillStyle: series[j].property.fillStyle,
                strokeStyle: series[j].property.strokeStyle,
                anchor: _anchor
            })
        }
    }
    if (legend) {
        // 绘制v标签标识
        x = anchor[0] + xGap
        let vTexts = []
        let vTextWidth = 0
        for (let i = 0; i < series.length; i++) {
            let s = series[i].text.data[0]
            vTexts.push(s)
            vTextWidth += ctx.measureText(s).width
        }
        vGap = anchor[2] * 0.02
        let _iw = Math.min(anchor[2] * 0.025, 15)
        let _y = y + anchor[3] * 0.125
        let _x = x + xWidth / 2 - (vTextWidth + vGap * (vTexts.length - 1) + (_iw * 1.25) * vTexts.length) / 2
        for (let i = 0; i < vTexts.length; i++) {
            await drawRect(ctx, {
                fillStyle: series[i].property.fillStyle,
                strokeStyle: series[i].property.strokeStyle,
                anchor: [_x, _y - _iw, _iw, _iw]
            })
            _x += (_iw * 1.25)
            ctx.fillStyle = 'rgb(89, 89, 89)'
            ctx.fillText(vTexts[i], _x, _y)
            _x += ctx.measureText(vTexts[i]).width
            _x += vGap
        }
    }
}

async function drawPieChart(title, chartData, legend, anchor, canvas, ctx) {
    if (title == '') {
        title = chartData.series[0].text.data[0]
    }
    if (title) {
        ctx.font = `${Math.min(anchor[3] * 0.07, 18.5)}px 等线`
        ctx.fillStyle = 'rgb(89, 89, 89)'
        let textWidth = ctx.measureText(title).width
        ctx.fillText(title, anchor[0] + anchor[2] / 2 - textWidth / 2, anchor[1] + anchor[3] * 0.06)
    }
    let extInfo = chartData.extInfo
    let holeSize = +(extInfo.holeSize || 0) / 100
    let series = chartData.series
    let values = series[0].value.data
    let dataPoints = series[0].dataPoint
    let totalValue = 0
    for (let i = 0; i < values.length; i++) {
        totalValue += (+values[i])
    }
    let xGap = anchor[2] * 0.05 // 开始间距
    let x = anchor[0] + xGap
    let xWidth = anchor[2] - xGap * 2
    let startY = title ? anchor[3] * 0.12 : anchor[3] * 0.05
    let y = anchor[1] + startY
    let yHeight = anchor[3] - startY - anchor[3] * 0.15
    let centerX = xWidth / 2
    let centerY = yHeight / 2
    let radius = Math.min(centerX, centerY)
    ctx.lineWidth = 0.5
    ctx.font = `${Math.min(anchor[2] * 0.048, 14)}px 等线`
    ctx.fillStyle = 'rgb(89, 89, 89)'
    ctx.save()
    ctx.translate(x + centerX, y + centerY)
    // arc 是以3点钟方向开始，反向旋转-90调整到0点开始
    ctx.rotate(-90 * Math.PI / 180)
    ctx.translate(-x - centerX, -y - centerY)
    let startAngle = 0
    if (extInfo.startAngle) {
        startAngle = extInfo.startAngle * (Math.PI / 180)
    }
    for (let i = 0; i < values.length; i++) {
        let property = dataPoints[i].property
        ctx.fillStyle = await toCtxPaint(ctx, property.fillStyle, property.anchor || anchor)
        if (property.strokeStyle) {
            ctx.lineWidth = property.strokeStyle.lineWidth || 1.5
            let lineCap = property.strokeStyle.lineCap
            if (!lineCap || lineCap == 'FLAT') {
                lineCap = 'butt'
            }
            ctx.lineCap = lineCap.toLowerCase()
            ctx.strokeStyle = await toCtxPaint(ctx, property.strokeStyle.paint, property.anchor || anchor)
        }
        let sliceAngle = (2 * Math.PI * values[i]) / totalValue
        ctx.beginPath()
        ctx.moveTo(x + centerX, y + centerY)
        // 实心圆
        ctx.arc(x + centerX, y + centerY, radius, startAngle, startAngle + sliceAngle, false)
        if (holeSize > 0) {
            // 空心圆
            let holeRadius = radius * holeSize
            ctx.arc(x + centerX, y + centerY, holeRadius, startAngle + sliceAngle, startAngle, true)
            ctx.closePath()
            ctx.save()
            ctx.clip()
            ctx.fill()
            ctx.stroke()
            ctx.restore()
        } else {
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }
        startAngle += sliceAngle
    }
    ctx.restore()
    if (legend) {
        // 绘制类目标签标识
        let vTexts = []
        let vTextWidth = 0
        let categorys = series[0].category.data
        for (let i = 0; i < categorys.length; i++) {
            let s = categorys[i]
            vTexts.push(s)
            vTextWidth += ctx.measureText(s).width
        }
        let vGap = anchor[2] * 0.03
        let _iw = Math.min(anchor[2] * 0.028, 15)
        let _y = y + yHeight + anchor[3] * 0.125
        let _x = x + xWidth / 2 - (vTextWidth + vGap * (vTexts.length - 1) + (_iw * 1.25) * vTexts.length) / 2
        for (let i = 0; i < vTexts.length; i++) {
            let property = dataPoints[i].property
            await drawRect(ctx, {
                fillStyle: property.fillStyle,
                strokeStyle: property.strokeStyle,
                anchor: [_x, _y - _iw, _iw, _iw]
            })
            _x += (_iw * 1.25)
            ctx.fillStyle = 'rgb(89, 89, 89)'
            ctx.fillText(vTexts[i], _x, _y)
            _x += ctx.measureText(vTexts[i]).width
            _x += vGap
        }
    }
}

async function drawLineChart(title, chartData, legend, anchor, canvas, ctx) {
    if (title) {
        ctx.font = `${Math.min(anchor[3] * 0.07, 18.5)}px 等线`
        ctx.fillStyle = 'rgb(89, 89, 89)'
        let textWidth = ctx.measureText(title).width
        ctx.fillText(title, anchor[0] + anchor[2] / 2 - textWidth / 2, anchor[1] + anchor[3] * 0.06)
    }
    let extInfo = chartData.extInfo
    let smooth = extInfo.smooth == 'true'
    let series = chartData.series
    let categoryAxis = chartData.categoryAxis
    let valueAxes = chartData.valueAxes && chartData.valueAxes.length > 0 ? chartData.valueAxes[0] : null
    let minValue = 0, maxValue = 0
    for (let i = 0; i < series.length; i++) {
        minValue = Math.min(minValue, ...series[i].value.data)
        maxValue = Math.max(maxValue, ...series[i].value.data)
    }
    ctx.lineWidth = 0.5
    ctx.font = `${Math.min(anchor[3] * 0.06, 14)}px 等线`
    ctx.fillStyle = 'rgb(89, 89, 89)'
    ctx.strokeStyle = 'rgb(217, 217, 217)'
    let ticks = calculateTicks(minValue, maxValue, 5, 10)
    let xGap = ctx.measureText(ticks[ticks.length - 1] + '00').width
    let x = anchor[0] + xGap
    let xWidth = anchor[2] - xGap * 1.5
    let startY = title ? anchor[3] * 0.12 : anchor[3] * 0.05
    let y = anchor[1] + startY
    let yHeight = anchor[3] - startY - anchor[3] * 0.15
    let yGap = yHeight / (ticks.length - 1)
    ctx.beginPath()
    for (let i = 0; i < ticks.length; i++) {
        // y轴数值
        if (valueAxes && !valueAxes.deleted) {
            ctx.textAlign = 'right'
            let v = ticks[ticks.length - 1 - i]
            let vs = v.toString()
            if (vs.indexOf('.') > -1 && vs.split('.')[1].length > 1) {
                vs = v.toFixed(1)
            }
            ctx.fillText(vs, x - 4, y + 6)
            ctx.textAlign = 'start'
        }
        if (extInfo.majorGridlines == 'true') {
            // 网格线
            ctx.moveTo(x, y)
            ctx.lineTo(x + xWidth, y)
        }
        y += yGap
    }
    ctx.stroke()
    x += xGap
    y -= yGap
    let catGap = anchor[2] * 0.05 // 类目间距
    let categorys = series[0].category.data
    let categoryWidth = (xWidth - catGap * (categorys.length - 1) - xGap * 1.5) / categorys.length
    let cxList = []
    // 绘制类目
    for (let i = 0; i < categorys.length; i++) {
        let _cx = (categoryWidth + catGap) * i + categoryWidth / 2 - ctx.measureText(categorys[i]).width / 2
        cxList.push(_cx)
        if (categoryAxis && !categoryAxis.deleted) {
            ctx.textAlign = 'center'
            ctx.fillText(categorys[i], x + _cx, y + anchor[3] * 0.05)
            ctx.textAlign = 'start'
        }
    }
    // 绘制折线
    for (let i = 0; i < series.length; i++) {
        let property = series[i].property
        if (property.strokeStyle) {
            ctx.lineWidth = property.strokeStyle.lineWidth || 1.5
            let lineCap = property.strokeStyle.lineCap
            if (!lineCap || lineCap == 'FLAT') {
                lineCap = 'butt'
            }
            ctx.lineCap = lineCap.toLowerCase()
            ctx.strokeStyle = await toCtxPaint(ctx, property.strokeStyle.paint, property.anchor)
        }
        ctx.beginPath()
        let points = []
        for (let j = 0; j < categorys.length; j++) {
            let vHeight = (series[i].value.data[j] / ticks[ticks.length - 1]) * yHeight
            let _x = x + cxList[j]
            let _y = y - vHeight
            if (j == 0) {
                ctx.moveTo(_x, _y)
            } else if (smooth) {
                points.push({ x: _x, y: _y })
            } else {
                ctx.lineTo(_x, _y)
            }
        }
        if (smooth) {
            let j = 0
            for (; j < points.length - 2; j++) {
                let xc = (points[j].x + points[j + 1].x) / 2
                let yc = (points[j].y + points[j + 1].y) / 2
                ctx.quadraticCurveTo(points[j].x, points[j].y, xc, yc)
            }
            ctx.quadraticCurveTo(points[j].x, points[j].y, points[j + 1].x, points[j + 1].y)
        }
        ctx.stroke()
    }
    if (legend) {
        // 绘制v标签标识
        x = anchor[0] + xGap
        let vTexts = []
        let vTextWidth = 0
        for (let i = 0; i < series.length; i++) {
            let s = series[i].text.data[0]
            vTexts.push(s)
            vTextWidth += ctx.measureText(s).width
        }
        let vGap = anchor[2] * 0.02
        let _iw = anchor[2] * 0.04
        let _y = y + anchor[3] * 0.128
        let _x = x + xWidth / 2 - (vTextWidth + vGap * (vTexts.length - 1) + (_iw + 2) * vTexts.length) / 2
        for (let i = 0; i < vTexts.length; i++) {
            let property = series[i].property
            if (property.strokeStyle) {
                ctx.lineWidth = property.strokeStyle.lineWidth || 1.5
                let lineCap = property.strokeStyle.lineCap
                if (!lineCap || lineCap == 'FLAT') {
                    lineCap = 'butt'
                }
                ctx.lineCap = lineCap.toLowerCase()
                ctx.strokeStyle = await toCtxPaint(ctx, property.strokeStyle.paint, property.anchor)
            }
            ctx.beginPath()
            ctx.moveTo(_x, _y - 4)
            ctx.lineTo(_x + _iw, _y - 4)
            ctx.stroke()
            _x += (_iw + 2)
            ctx.fillStyle = 'rgb(89, 89, 89)'
            ctx.fillText(vTexts[i], _x, _y)
            _x += ctx.measureText(vTexts[i]).width
            _x += vGap
        }
    }
}

function calculateTicks(minValue, maxValue, minTicks, maxTicks) {
    let range = maxValue - minValue
    let rawInterval = range / (minTicks - 1)
    let magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
    let normalizedInterval = rawInterval / magnitude
    let adjustedInterval
    if (normalizedInterval <= 1.5) {
        adjustedInterval = 1
    } else if (normalizedInterval <= 3) {
        adjustedInterval = 2
    } else if (normalizedInterval <= 7) {
        adjustedInterval = 5
    } else {
        adjustedInterval = 10
    }
    adjustedInterval *= magnitude
    let tickEnd = Math.ceil(maxValue / adjustedInterval) * adjustedInterval
    let ticks = []
    for (let tick = 0; tick <= tickEnd; tick += adjustedInterval) {
        ticks.push(tick)
    }
    if (ticks.length < minTicks) {
        for (let i = ticks.length; i < minTicks; i++) {
            ticks.push(i * adjustedInterval)
        }
    } else {
        while (ticks.length > maxTicks) {
            adjustedInterval *= 2
            ticks = []
            tickEnd = Math.ceil(maxValue / adjustedInterval) * adjustedInterval
            for (let tick = 0; tick <= tickEnd; tick += adjustedInterval) {
                ticks.push(tick)
            }
        }
    }
    return ticks
}

async function drawRect(ctx, property) {
    ctx.fillStyle = await toCtxPaint(ctx, property.fillStyle, property.anchor)
    if (property.strokeStyle) {
        ctx.lineWidth = property.strokeStyle.lineWidth || 1
        ctx.strokeStyle = await toCtxPaint(ctx, property.strokeStyle.paint, property.anchor)
    }
    ctx.fillRect(property.anchor[0], property.anchor[1], property.anchor[2], property.anchor[3])
}

function toCtxPaint(ctx, paint, anchor, isBackground, defaultColor) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Promise((resolve, reject) => {
        if (!paint) {
            resolve(defaultColor || 'transparent')
        } else if (paint.type == 'noFill') {
            // 无填充
            resolve('transparent')
        } else if (paint.type == 'color') {
            // 颜色
            resolve(toColor(paint.color, defaultColor))
        } else if (paint.type == 'bgFill') {
            // 背景填充
            resolve(ctx.bgFillStyle || defaultColor || 'transparent')
        } else if (paint.type == 'groupFill') {
            // 组合背景
            let groupFillStyle = paint.parentGroupFillStyle || ctx.groupFillStyle
            if (groupFillStyle) {
                toCtxPaint(ctx, groupFillStyle, anchor || groupFillStyle.groupAnchor, false, defaultColor).then(res => {
                    resolve(res)
                })
            } else {
                resolve(defaultColor || 'transparent')
            }
        } else if (paint.type == 'gradient') {
            // 渐变
            let gradient = paint.gradient
            let x = anchor[0], y = anchor[1], width = anchor[2], height = anchor[3]
            let centerX = x + width / 2
            let centerY = y + height / 2
            let gradientObj
            // linear,circular,rectangular,shape
            if (gradient.gradientType == 'circular') {
                // 射线
                let radius = Math.sqrt(width * width + height * height) * (gradient.insets[1] == 0.5 ? 0.5 : 1)
                let cx = centerX + width * (gradient.insets[1] - gradient.insets[3]) / 2
                let cy = centerY + height * (gradient.insets[0] - gradient.insets[2]) / 2
                gradientObj = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
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
                gradientObj = ctx.createLinearGradient(startX, startY, endX, endY)
            }
            for (let i = 0; i < gradient.colors.length; i++) {
                let color = gradient.colors[i]
                gradientObj.addColorStop(gradient.fractions[i], toColor(color))
            }
            resolve(gradientObj)
        } else if (anchor && anchor[2] == 0 && anchor[3] == 0) {
            resolve('transparent')
        } else if (paint.type == 'texture') {
            // 图片或纹理
            let texture = paint.texture
            loadChartImage(texture.imageData).then(img => {
                let pat = createCtxTexturePattern(ctx, img, texture, anchor)
                resolve(pat)
            })
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
            let imgSrc = imgCanvas.toDataURL()
            let image = new Image()
            image.src = imgSrc
            image.onload = async function() {
                resolve(ctx.createPattern(image, 'no-repeat'))
            }
        }
    })
}

function createCtxTexturePattern(ctx, img, texture, anchor) {
    let width = anchor[2]
    let height = anchor[3]
    let mode = texture.alignment || !texture.stretch ? 'repeat' : 'no-repeat'
    if (width < 1 && height < 1 || isNaN(width) || isNaN(height)) {
        return ctx.createPattern(img, mode)
    }
    if (texture.alignment || !texture.stretch) {
        width = img.width
        height = img.height
    }
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
        let x = 0, y = 0
        if (texture.alignment == 'CENTER') {
            if (width > anchor[2]) {
                x = (width - anchor[2]) / 2
            }
            if (height > anchor[3]) {
                y = (height - anchor[3]) / 2
            }
        }
        patternCtx.drawImage(img, x, y, width, height, 0, 0, width, height)
    } else {
        if (imgInsets) {
            patternCtx.drawImage(img, imgInsets[0], imgInsets[1], imgInsets[2], imgInsets[3], 0, 0, width, height)
        } else {
            patternCtx.drawImage(img, 0, 0, width, height)
        }
    }
    if (texture.duoTone && texture.duoTone.length > 0 && texture.duoTonePrst) {
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
    }
    return ctx.createPattern(patternCanvas, mode)
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

function loadChartImage(src) {
    return new Promise(resolve => {
        if (!src) {
            resolve()
            return
        }
        let img = new Image()
        let eqOrigin = src.startsWith('data:') || src.startsWith(document.location.origin) || (src.startsWith('//') && (document.location.protocol + src).startsWith(document.location.origin))
        if (!eqOrigin) {
            img.crossOrigin = 'anonymous'
        }
        img.src = src
        img.onload = function() {
            resolve(img)
        }
        img.onerror = function (e) {
            resolve()
            console.log('图片加载失败: ', src, e)
        }
    })
}

// export { drawChart }