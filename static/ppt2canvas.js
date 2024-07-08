function Ppt2Canvas(_canvas, imageCrossOrigin) {
    var canvas = (typeof _canvas == 'string') ? document.getElementById(_canvas) : _canvas
	var ctx = canvas.getContext('2d')
	var pptx = null
	var page = null
    var idMap = {}
	var imageCache = {}
	var pageIndex = 0
	var templateHandle = null

	this.drawPptx = async (pptxObj, pageIdx) => {
	    idMap = {}
		imageCache = {}
		pptx = pptxObj
		pageIndex = pageIdx
		page = pptxObj.pages[pageIdx]
		canvas.width = canvas.width
		canvas.height = canvas.height
		ctx.scaleX = canvas.width / pptxObj.width
		ctx.scaleY = canvas.height / pptxObj.height
		ctx.scale(ctx.scaleX, ctx.scaleY)
		ctx.interior = ctx._interior = null
		let placeholder = {}
		let slideMasterIdx = page.extInfo.slideMasterIdx
		if (slideMasterIdx != null && pptxObj.slideMasters) {
			let slideMaster = pptxObj.slideMasters[slideMasterIdx]
			let slideLayoutIdx = page.extInfo.slideLayoutIdx
			let slideLayout = slideLayoutIdx != null ? slideMaster.slideLayouts[slideLayoutIdx] : null
			await drawBackground(page.extInfo.background || (slideLayout || {}).background || slideMaster.background)
			await drawSlideMaster(slideMaster, slideLayout, placeholder)
			if (slideLayout) {
			    await drawSlideLayout(slideLayout, placeholder)
			}
		} else {
			await drawBackground(page.extInfo.background)
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
			await drawElement(page.children[i])
		}
        recursion(page.children, obj => {
            idMap[obj.id] = obj
        })
	}

	this.getCanvas = () => {
	    return canvas
	}

    this.resetSize = (width, height) => {
        canvas.width = width * 2
        canvas.height = height * 2
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'
        if (pptx) {
            this.drawPptx(pptx, pageIndex)
        }
    }

	async function drawElement(obj) {
		ctx.fillStyle = 'transparent'
		ctx.strokeStyle = 'transparent'
		if (obj.noDraw || !obj.extInfo.property.anchor) {
			// console.log('ignore element:', obj)
			return
		}
		if (obj.type == 'text' || obj.type == 'freeform') {
			await drawText(obj)
		} else if (obj.type == 'image') {
			await drawImage(obj)
		} else if (obj.type == 'diagram') {
			await drawDiagram(obj)
		} else if (obj.type == 'container') {
			await drawContainer(obj)
		} else if (obj.type == 'table') {
			await drawTable(obj)
		} else if (obj.type == 'connector') {
			await drawConnector(obj)
		} else if (obj.type == 'graphicFrame') {
			await drawGraphicFrame(obj)
		}
	}

	async function drawText(obj) {
		property = obj.extInfo.property
		geometryName = (property.geometry || {}).name || 'rect'
		ctx.save()
		shapeHandle(property, true)
		let marginTop = property.strokeStyle ? (property.strokeStyle.lineWidth || 1) : 0
		if (geometryName == 'tableColumn') {
			await drawTableColumn(property)
		} else {
			await drawGeometry(property)
		}
		if (templateHandle) {
		    await templateHandle('text', obj, ctx)
		}
		if (obj.children) {
			let textInsets = property.textInsets || [0, 0, 0, 0]
			let isVertical = property.textDirection && property.textDirection.indexOf('VERTICAL') > -1
			let verticalAlignment = property.textVerticalAlignment
			if (!isVertical && (verticalAlignment == 'MIDDLE' || verticalAlignment == 'BOTTOM')) {
				let totalTextHeight = calcTextHeight(obj)
				if (totalTextHeight < property.anchor[3]) {
					if (verticalAlignment == 'MIDDLE') {
						marginTop += (property.anchor[3] - totalTextHeight - textInsets[0] - textInsets[2]) / 2 + textInsets[0]
					} else if (verticalAlignment == 'BOTTOM') {
						marginTop += (property.anchor[3] - totalTextHeight - textInsets[2])
					}
				}
			} else {
				marginTop += textInsets[0]
			}
			for (let i = 0; i < obj.children.length; i++) {
				let p = obj.children[i]
				if (isVertical) {
				    await drawTextP(obj, p, isVertical, 0, i)
				} else {
				    marginTop += await drawTextP(obj, p, isVertical, marginTop, i)
				}
			}
		}
		ctx.restore()
	}

	function calcTextHeight(obj) {
		let totalTextHeight = 0
		let wordWrap = obj.extInfo.property.textWordWrap
		let textInsets = obj.extInfo.property.textInsets || [0, 0, 0, 0]
		let wInset = textInsets[1] + textInsets[3]
		for (let i = 0; i < obj.children.length; i++) {
			let p = obj.children[i]
			let lineSpacing = Math.max((p.extInfo.property.lineSpacing || 100) / 100, 1)
			let maxFontSize = 0
			let underlined = false
			let totalTextWidth = 0
			for (let j = 0; j < p.children.length; j++) {
				let r_property = p.children[j].extInfo.property
				let fontSize = r_property.fontSize || 16
				let text = p.children[j].text
				if (text == '\n') {
					totalTextHeight += lineSpacing * fontSize
					continue
				}
				if (fontSize > maxFontSize) {
					maxFontSize = fontSize
				}
				if (r_property.underlined) {
					underlined = true
				}
				let fonts = []
				if (r_property.bold) {
					fonts.push('bold')
				}
				if (r_property.italic) {
					fonts.push('italic')
				}
				fonts.push(fontSize + 'px')
				fonts.push('"' + (r_property.fontFamily || '等线') + '"')
				ctx.font = fonts.join(' ')
				let lines = text.split('\n')
				let maxTextWidth = 0
				for (let s = 0; s < lines.length; s++) {
					let width = ctx.measureText(lines[s]).width
					if (width > maxTextWidth) {
						maxTextWidth = width
					}
				}
				totalTextWidth += maxTextWidth
				if (lines.length > 1) {
					totalTextHeight += (lines.length - 1) * lineSpacing * fontSize
				}
			}
			if (wordWrap) {
				let lineNum = parseInt((totalTextWidth - 1) / (obj.extInfo.property.anchor[2] - wInset)) + 1
				totalTextHeight += lineNum * lineSpacing * maxFontSize
			} else {
				totalTextHeight += lineSpacing * maxFontSize
			}
			if (underlined) {
				totalTextHeight += 1
			}
		}
		return totalTextHeight
	}

	async function drawTextP(textObj, p, isVertical, marginTop, pIdx) {
		if (!p.children) {
			return
		}
		let fontList = []
		let underlined = false
		let totalTextWidth = 0
		let anchor = textObj.extInfo.property.anchor
		let wordWrap = textObj.extInfo.property.textWordWrap
		for (let i = 0; i < p.children.length; i++) {
			let r = p.children[i]
			let property = r.extInfo.property
			let fontSize = property.fontSize || 16
			let fonts = []
			if (property.bold) {
				fonts.push('bold')
			}
			if (property.italic) {
				fonts.push('italic')
			}
			if (property.slideNum) {
				r.text = (pageIndex + 1) + ''
			}
			fonts.push(fontSize + 'px')
			fonts.push('"' + (property.fontFamily || '等线') + '"')
			let font = fonts.join(' ')
			fontList.push(font)
			ctx.font = font
			if (isVertical) {
				if (property.lang == 'en-US' && /^[0-9a-zA-Z]+$/.test(r.text)) {
					if (fontSize > totalTextWidth) {
						totalTextWidth = fontSize
					}
				} else if (r.text.length > 0) {
					let width = ctx.measureText(r.text[0]).width
					if (width > totalTextWidth) {
						totalTextWidth = width
					}
				}
			} else {
				let lines = r.text.split('\n')
				let maxTextWidth = 0
				for (let s = 0; s < lines.length; s++) {
					let width = ctx.measureText(lines[s]).width
					if (width > maxTextWidth) {
						maxTextWidth = width
					}
				}
				totalTextWidth += maxTextWidth
			}
			if (property.underlined) {
				underlined = true
			}
		}
		if (wordWrap) {
			totalTextWidth = Math.min(totalTextWidth, anchor[2])
		}
		let textAlign = p.extInfo.property.textAlign
		let verticalAlignment = textObj.extInfo.property.textVerticalAlignment
		let textInsets = textObj.extInfo.property.textInsets || [0, 0, 0, 0]
		let lineSpacing = Math.max((p.extInfo.property.lineSpacing || 100) / 100, 1)
		let x = anchor[0]
		let y = anchor[1] + (marginTop || 0)
		let endX = anchor[0] + anchor[2] - textInsets[3]
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		if (textAlign == 'CENTER') {
			x = x + (anchor[2] - totalTextWidth - textInsets[1] - textInsets[3]) / 2 + textInsets[1]
		} else if (textAlign == 'RIGHT') {
			x = x + anchor[2] - textInsets[3] - totalTextWidth
		} else {
			x = x + textInsets[1]
		}
		const _x = x
		const _y = y
		let lastWord = null
		let maxFontSize = 0
		for (let i = 0; i < p.children.length; i++) {
			let r = p.children[i]
			let property = r.extInfo.property
			let fontSize = property.fontSize || 16
			let drawString = (s, x, y) => {
				doShadow(ctx, property.shadow)
				ctx.translate(x, y)
				ctx.fillText(s, 0, 0)
				ctx.translate(-x, -y)
			}
			let fillStyle = await toPaint(property.fontColor, anchor)
			ctx.fillStyle = fillStyle
			if (property.line && (property.fontColor == null || property.fontColor.type == 'noFill')) {
				drawString = (s, x, y) => {
					doShadow(ctx, property.shadow)
					ctx.translate(x, y)
					ctx.strokeText(s, 0, 0)
					ctx.translate(-x, -y)
				}
				ctx.strokeStyle = await toPaint(property.line.paint, anchor)
			}
			ctx.font = fontList[i]
			if (fontSize > maxFontSize) {
				maxFontSize = fontSize
			}
			if (r.text == '\n') {
				y += lineSpacing * fontSize
				x = _x
				continue
			}
			if (isVertical) {
				// 竖版
				x = x + fontSize * pIdx
				if (property.lang == 'en-US' && /^[0-9a-zA-Z]+$/.test(r.text)) {
					// 数字英文竖着的时候需要旋转90°方式呈现
					let textWidth = ctx.measureText(r.text).width
					let fontSize = property.fontSize || 16
					ctx.save()
					ctx.translate(x, y + fontSize)
					ctx.rotate(90 * Math.PI / 180)
					ctx.translate(-x, -y - fontSize)
					drawString(r.text, x - fontSize, y)
					ctx.restore()
					y += textWidth
				} else {
					for (let j = 0; j < r.text.length; j++) {
						let text = r.text[j]
						drawString(text, x, y)
						y += fontSize
					}
				}
				if (property.underlined) {
					let lineX = x
					let lineY = _y
					ctx.lineWidth = 1
					ctx.strokeStyle = fillStyle
					ctx.beginPath()
					ctx.moveTo(lineX, lineY)
					ctx.lineTo(lineX, lineY + (y - _y))
					ctx.closePath()
					ctx.stroke()
				}
			} else if (wordWrap) {
				// 横版-自动换行
				let texts = splitWords(r.text)
				let drawLine = (textWidth) => {
					if (property.underlined) {
						let lineX = _x
						let lineY = y
						if (verticalAlignment == 'MIDDLE') {
							lineY = lineY + fontSize / 2 + 1
						} else if (verticalAlignment == 'BOTTOM') {
							lineY = lineY + 1
						} else {
							lineY = lineY + fontSize + 1
						}
						ctx.lineWidth = 1
						ctx.strokeStyle = fillStyle
						ctx.beginPath()
						ctx.moveTo(lineX, lineY)
						ctx.lineTo(lineX + textWidth, lineY)
						ctx.closePath()
						ctx.stroke()
					}
				}
				for (let j = 0; j < texts.length; j++) {
					let item = texts[j]
					if (item.text == '\n') {
						x = _x
						y += lineSpacing * fontSize
						lastWord = null
						continue
					}
					if (item.word && lastWord != null && !lastWord) {
						let textWidth = ctx.measureText(item.text).width
						if (x + textWidth > endX + fontSize / 4) {
							drawLine(x - _x)
							x = _x
							y += lineSpacing * fontSize
						}
					}
					for (let s = 0; s < item.text.length; s++) {
						let text = item.text[s]
						let textWidth = ctx.measureText(text).width
						if (x + textWidth > endX + fontSize / 4 && !isSymbol(text)) {
							drawLine(x - _x)
							x = _x
							y += lineSpacing * fontSize
						}
						let ty = y
						if (verticalAlignment == 'MIDDLE') {
							ctx.textBaseline = 'middle'
							ty = ty + (lineSpacing * fontSize) / 2
						} else if (verticalAlignment == 'BOTTOM') {
							ctx.textBaseline = 'bottom'
							ty = ty + (lineSpacing * fontSize)
						} else {
							ctx.textBaseline = 'top'
						}
						drawString(text, x, ty)
						x += textWidth
					}
					lastWord = item.word
				}
				if (i == p.children.length - 1) {
					drawLine(x - _x)
				}
			} else {
				// 横版-不自动换行
				let lines = r.text.split('\n')
				for (let s = 0; s < lines.length; s++) {
					if (s != 0) {
						x = _x
						y += lineSpacing * fontSize
					}
					let ty = y
					if (verticalAlignment == 'MIDDLE') {
						ctx.textBaseline = 'middle'
						ty = ty + (lineSpacing * fontSize) / 2
					} else if (verticalAlignment == 'BOTTOM') {
						ctx.textBaseline = 'bottom'
						ty = ty + (lineSpacing * fontSize)
					} else {
						ctx.textBaseline = 'top'
					}
					drawString(lines[s], x, ty)
					let textWidth = ctx.measureText(lines[s]).width
					if (property.underlined) {
						let lineX = x
						let lineY = y
						if (verticalAlignment == 'MIDDLE') {
							lineY = lineY + fontSize / 2 + 1
						} else if (verticalAlignment == 'BOTTOM') {
							lineY = lineY + 1
						} else {
							lineY = lineY + fontSize + 1
						}
						ctx.lineWidth = 1
						ctx.strokeStyle = fillStyle
						ctx.beginPath()
						ctx.moveTo(lineX, lineY)
						ctx.lineTo(lineX + textWidth, lineY)
						ctx.closePath()
						ctx.stroke()
					}
					x += textWidth
				}
			}
		}
		return (y - _y) + (underlined && !isVertical ? 1 : 0) + lineSpacing * maxFontSize
	}

	async function drawImage(obj) {
		let property = obj.extInfo.property
		ctx.save()
		shapeHandle(property)
		if (property.fillStyle && property.fillStyle.texture) {
			property.fillStyle.texture.imageData = property.image
		} else {
			property.fillStyle = { 'type': 'texture', texture: { 'imageData': property.image, insets: property.clipping } }
		}
		if (!property.geometry) {
			property.geometry = { name: 'rect' }
		}
		await drawGeometry(property)
		if (templateHandle) {
		   await templateHandle('image', obj, ctx)
		}
		ctx.restore()
	}

	async function drawTableColumn(property) {
		let anchor = property.anchor
		let x = anchor[0] - 1
		let endX = anchor[0] + anchor[2] + 1
		let y = anchor[1] - 1
		let endY = anchor[1] + anchor[3] + 1
		let borders = property.borders // top/left/bottom/right
		ctx.beginPath()
		ctx.moveTo(x, y)
		let top = borders[0]
		ctx.strokeStyle = toColor({ color: top.color }, 'white')
		ctx.lineWidth = top.lineWidth
		ctx.lineTo(endX, y)
		let right = borders[3]
		ctx.strokeStyle = toColor({ color: right.color }, 'white')
		ctx.lineWidth = right.lineWidth
		ctx.lineTo(endX, endY)
		let bottom = borders[2]
		ctx.strokeStyle = toColor({ color: bottom.color }, 'white')
		ctx.lineWidth = bottom.lineWidth
		ctx.lineTo(x, endY)
		let left = borders[1]
		ctx.strokeStyle = toColor({ color: left.color }, 'white')
		ctx.lineWidth = left.lineWidth
		ctx.lineTo(x, anchor[1])
		ctx.closePath()
		ctx.fillStyle = await toPaint(property.fillStyle, property.anchor)
		ctx.fill()
		ctx.stroke()
	}

	async function drawDiagram(obj) {
		let property = obj.extInfo.property
		ctx.save()
		ctx.translate(property.anchor[0], property.anchor[1])
		if (templateHandle) {
		    await templateHandle('diagram', obj, ctx)
		}
		for (let i = 0; i < obj.children.length; i++) {
			await drawElement(obj.children[i])
		}
		ctx.translate(-property.anchor[0], -property.anchor[1])
		ctx.restore()
	}

	async function drawContainer(obj) {
		let property = obj.extInfo.property
		if (property.realType == 'Group') {
			ctx.save()
			let _groupFlipX = ctx.groupFlipX
			let _groupFlipY = ctx.groupFlipY
			let _groupRotation = ctx.groupRotation
			shapeHandle(property)
			if (templateHandle) {
                await templateHandle('container', obj, ctx)
            }
			let parentGroupFillStyle = ctx.groupFillStyle
			let groupFillStyle = property.groupFillStyle
			if (groupFillStyle) {
				groupFillStyle = JSON.parse(JSON.stringify(groupFillStyle))
				groupFillStyle.groupAnchor = property.anchor
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
				await drawElement(copyChildren[i])
			}
			ctx.interior = ctx._interior
			ctx.groupFlipX = _groupFlipX
			ctx.groupFlipY = _groupFlipY
			ctx.groupRotation = _groupRotation
			ctx.restore()
		} else {
			for (let i = 0; i < obj.children.length; i++) {
				await drawElement(obj.children[i])
			}
		}
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

	async function drawConnector(obj) {
		let property = obj.extInfo.property
		ctx.save()
		shapeHandle(property)
		await drawGeometry(property)
		if (templateHandle) {
            await templateHandle('connector', obj, ctx)
        }
		ctx.restore()
	}

	async function drawGraphicFrame(obj) {
		let property = obj.extInfo.property
		ctx.save()
		shapeHandle(property)
		if (templateHandle) {
            await templateHandle('graphicFrame', obj, ctx)
        }
		if (property.chart && property.chart.chartData && property.chart.chartData.length > 0) {
			await drawChart(property.chart, property.anchor, canvas, ctx)
		}
		ctx.restore()
	}

	async function drawTable(obj) {
		let property = obj.extInfo.property
		for (let i = 0; i < obj.children.length; i++) {
			let row = obj.children[i]
			await drawTableRow(obj, row)
		}
	}

	async function drawTableRow(table, row) {
		let property = row.extInfo.property
		for (let i = 0; i < row.children.length; i++) {
			let column = row.children[i]
			await drawText(column)
		}
	}

	async function drawGeometry(property) {
		let geometry = property.geometry
		let anchor = property.anchor
		if (!geometry || !anchor || (anchor[2] == 0 && anchor[3] == 0)) {
			return
		}
		ctx.save()
		ctx.translate(anchor[0], anchor[1])
		let paths = geometryPaths(property)
		let _anchor = [0, 0, anchor[2], anchor[3]]
		if (geometry.name == 'custom') {
			await drawPaths(paths, property, _anchor, anchor)
		} else if (geometry.name == 'line' || geometry.name == 'straightConnector1') {
			await drawPaths(paths, property, _anchor, anchor)
		} else {
			await drawPaths(paths, property, _anchor, anchor)
		}
		ctx.translate(-anchor[0], -anchor[1])
		ctx.restore()
	}

	async function drawPaths(paths, property, anchor, real_anchor) {
		for (let i = 0; i < paths.length; i++) {
			let path = paths[i]
			// console.log('path: ', path)
			ctx.save()
			let scaleX = path.scaleX
			let scaleY = path.scaleY
			ctx.scale(scaleX, scaleY)
			let _anchor = [anchor[0], anchor[1], anchor[2], anchor[3]]
			if (scaleX != 1 || scaleY != 1) {
                _anchor[0] = _anchor[0] / scaleX
                _anchor[1] = _anchor[1] / scaleY
                _anchor[2] = _anchor[2] / scaleX
                _anchor[3] = _anchor[3] / scaleY
            }
			ctx.beginPath()
			let split = path.path.replace(/\s+/g, ' ').trim().split(' ')
			for (let j = 0; j < split.length; j++) {
				switch (split[j]) {
					case 'M':
						ctx.moveTo(split[++j], split[++j])
						break
					case 'L':
						ctx.lineTo(split[++j], split[++j])
						break
					case 'Q':
						ctx.quadraticCurveTo(split[++j], split[++j], split[++j], split[++j])
						break
					case 'C':
						ctx.bezierCurveTo(split[++j], split[++j], split[++j], split[++j], split[++j], split[++j])
						break
					case 'Z':
						ctx.closePath()
						break
				}
			}
			let strokeStyle = null
			if (property.strokeStyle) {
				ctx.lineWidth = (property.strokeStyle.lineWidth || 1) / scaleY
				let lineCap = property.strokeStyle.lineCap
				if (!lineCap || lineCap == 'FLAT') {
					lineCap = 'butt'
				}
				ctx.lineCap = lineCap.toLowerCase()
				strokeStyle = await toPaint(property.strokeStyle.paint, _anchor)
			}
			doShadow(ctx, property.shadow)
			if (path.stroked && strokeStyle) {
				ctx.strokeStyle = strokeStyle
			} else {
				ctx.strokeStyle = 'transparent'
			}
			ctx.stroke()
			ctx.scale(1 / scaleX, 1 / scaleY)
			let fillStyle = await toPaint(property.fillStyle, anchor)
			if (path.filled) {
				ctx.fillStyle = fillStyle
			} else {
				ctx.fillStyle = 'transparent'
			}
			if (property.fillStyle && property.fillStyle.type == 'bgFill') {
				let rotation = (property.rotation || 0) + (ctx.groupRotation || 0)
				if (rotation) {
					ctx.translate(real_anchor[2] / 2, real_anchor[3] / 2)
					ctx.rotate(-rotation * Math.PI / 180)
					ctx.translate(-real_anchor[2] / 2, -real_anchor[3] / 2)
				}
				let tx = 0, ty = 0
				if (ctx.interior) {
					tx = -ctx.interior.tx - real_anchor[0]
					ty = -ctx.interior.ty - real_anchor[1]
				} else {
					tx = -real_anchor[0]
					ty = -real_anchor[1]
				}
				ctx.translate(tx, ty)
				ctx.fill()
				ctx.translate(-tx, -ty)
			} else {
				ctx.fill()
			}
			ctx.restore()
		}
	}

	function shapeHandle(property, isText) {
		let anchor = property.anchor
		if (!anchor) {
			return
		}
		let cx = anchor[0] + anchor[2] / 2
		let cy = anchor[1] + anchor[3] / 2
		if (property.rotation) {
			// 旋转
			ctx.translate(cx, cy)
			ctx.rotate(property.rotation * Math.PI / 180)
			ctx.translate(-cx, -cy)
			if (property.realType == 'Group') {
			    ctx.groupRotation = (ctx.groupRotation || 0) + property.rotation
			}
		}
		if (isText) {
            let x = ctx.groupFlipX || 1
            let y = ctx.groupFlipY || 1
            if (property.flipVertical) {
                y *= -1
                ctx.translate(cx, cy)
                ctx.scale(1, -1)
                ctx.translate(-cx, -cy)
            }
            if (y == -1) {
                if (x == 1) {
                    ctx.translate(cx, cy)
                    ctx.scale(-1, 1)
                    ctx.translate(-cx, -cy)
                }
            } else if (x == -1) {
                ctx.translate(cx, cy)
                ctx.scale(-1, 1)
                ctx.translate(-cx, -cy)
            }
        } else {
            if (property.flipVertical) {
                ctx.translate(cx, cy)
                ctx.scale(1, -1)
                ctx.translate(-cx, -cy)
                if (property.realType == 'Group') {
                    ctx.groupFlipY = -(ctx.groupFlipY || 1)
                }
            }
            if (property.flipHorizontal) {
                ctx.translate(cx, cy)
                ctx.scale(-1, 1)
                ctx.translate(-cx, -cy)
                if (property.realType == 'Group') {
                    ctx.groupFlipX = -(ctx.groupFlipX || 1)
                }
            }
        }
		// 嵌套容器 Group
		let interior = property.interiorAnchor
		if (interior && interior.length > 0) {
			/*
			// 缩放
			let scaleX = interior[2] == 0 || anchor[2] == interior[2] ? 1 : anchor[2] / interior[2]
			let scaleY = interior[3] == 0 || anchor[3] == interior[3] ? 1 : anchor[3] / interior[3]
			ctx.scale(scaleX, scaleY)
			ctx.translate(anchor[0] / scaleX - interior[0], anchor[1] / scaleY - interior[1])
			*/
			let scaleX = interior[2] == 0 || anchor[2] == interior[2] ? 1 : anchor[2] / interior[2]
			let scaleY = interior[3] == 0 || anchor[3] == interior[3] ? 1 : anchor[3] / interior[3]
			let tx = anchor[0] - interior[0] * scaleX
			let ty = anchor[1] - interior[1] * scaleY
			ctx.translate(tx, ty)
			ctx._interior = ctx.interior
			ctx.interior = { scaleX, scaleY, tx, ty }
		} else if (property.realType == 'Group') {
			ctx._interior = ctx.interior
			ctx.interior = { scaleX: 1, scaleY: 1, tx: 0, ty: 0 }
		}
	}

	async function drawBackground(background) {
		if (!background) {
			ctx.bgFillStyle = null
			return
		}
		ctx.fillStyle = await toPaint(background.fillStyle, background.anchor, true)
		ctx.fillRect(background.anchor[0], background.anchor[1], background.anchor[2], background.anchor[3])
		ctx.bgFillStyle = ctx.fillStyle
	}

	async function drawSlideMaster(slideMaster, slideLayout, placeholder) {
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
			await drawElement(slideMaster.children[i])
		}
	}

	async function drawSlideLayout(slideLayout, placeholder) {
		recursion(slideLayout.children, obj => {
			if (obj.extInfo.property && obj.extInfo.property.placeholder) {
				obj.noDraw = true
                placeholder[obj.extInfo.property.placeholder.type] = obj.extInfo.property
			}
		})
		for (let i = 0; slideLayout.children && i < slideLayout.children.length; i++) {
			await drawElement(slideLayout.children[i])
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

	function doShadow(ctx, shadow) {
		if (!shadow) {
			return
		}
		ctx.shadowBlur = shadow.blur || 0
		ctx.shadowColor = toColor(shadow.fillStyle.color)
		if (shadow.distance) {
			let radians = (shadow.angle || 0) * Math.PI / 180
			let x = 0, y = 0, r = shadow.distance * 2
			ctx.shadowOffsetX = x + r * Math.cos(radians)
			ctx.shadowOffsetY = y + r * Math.sin(radians)
		}
	}

	function toPaint(paint, anchor, isBackground, defaultColor) {
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
					toPaint(groupFillStyle, anchor || groupFillStyle.groupAnchor, false, defaultColor).then(res => {
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
				let anonymous = texture.duoTone && texture.duoTone.length > 0 && texture.duoTonePrst
				loadImage(texture.imageData, anonymous).then(img => {
				    if (img) {
                        let pat = createTexturePattern(img, texture, anchor, isBackground)
                        resolve(pat)
					} else {
					    resolve('transparent')
					}
				})
			} else if (paint.type == 'pattern') {
				// 图案
				let pattern = paint.pattern
				let prst = pattern.prst
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

	function createTexturePattern(img, texture, anchor, isBackground) {
		let width = anchor[2]
		let height = anchor[3]
		let mode = texture.alignment ? 'repeat' : 'no-repeat'
		if (width < 1 && height < 1 || isNaN(width) || isNaN(height)) {
			return ctx.createPattern(img, mode)
		}
		if (texture.alignment) {
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
            } catch(e) {}
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

	function toColorValue(r, g, b, a) {
		a = (a == null ? 255 : a)
		return (a & 255) << 24 | (r & 255) << 16 | (g & 255) << 8 | (b & 255) << 0
	}

	function loadImage(src, anonymous) {
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
				if (imageCrossOrigin || anonymous) {
                    let eqOrigin = src.startsWith('data:') || src.startsWith(document.location.origin) || (src.startsWith('//') && (document.location.protocol + src).startsWith(document.location.origin))
                    if (!eqOrigin) {
                        // anonymous / use-credentials
                        img.crossOrigin = imageCrossOrigin || 'anonymous'
                    }
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

	function value2px(v, isEmu) {
		if (isEmu) {
			return +v / 12700
		} else {
			return +v
		}
	}

	function value2emu(v) {
		return +v * 12700
	}

	function getTfx(x, div) {
		if (div) {
			return x / (ctx.getTransform().a / ctx.scaleX)
		} else {
			return x * (ctx.getTransform().a / ctx.scaleX)
		}
	}

	function getTfy(y, div) {
		if (div) {
			return y / (ctx.getTransform().d / ctx.scaleY)
		} else {
			return y * (ctx.getTransform().d / ctx.scaleY)
		}
	}

	function splitWords(str) {
		if (!str) {
			return []
		}
		let pattern = /^[0-9a-zA-Z]+$/
		let array = []
		let item = ''
		let math = null
		for (let i = 0; i < str.length; i++) {
			if (str[i] == '\n') {
				if (item) {
					array.push({ text: item, word: math })
				}
				array.push({ text: '\n', word: false })
				item = ''
				math = null
			} else {
				let _math = pattern.test(str[i])
				if (math == null) {
					math = _math
					item += str[i]
				} else if (_math == math) {
					item += str[i]
				} else {
					array.push({ text: item, word: math })
					item = str[i]
					math = _math
				}
			}
		}
		if (item) {
			array.push({ text: item, word: math })
		}
		return array
	}

	function isSymbol(s) {
		switch (s) {
			case ',':
			case '.':
			case '!':
			case '?':
			case ')':
			case ';':
			case '，':
			case '。':
			case '！':
			case '？':
			case '）':
			case '；':
			case '”':
			case ' ':
				return true
		}
		return false
	}

	function rgb2hsv(r, g, b) {
		r /= 255, g /= 255, b /= 255
		let max = Math.max(r, g, b), min = Math.min(r, g, b)
		let h, s, v = max
		let d = max - min
		s = max == 0 ? 0 : d / max
		if (max == min) {
			h = 0
		} else {
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break
				case g: h = (b - r) / d + 2; break
				case b: h = (r - g) / d + 4; break
			}
			h /= 6
		}
		return [h, s, v]
	}

	function hsv2rgb(h, s, v) {
		let r, g, b
		let i = Math.floor(h * 6)
		let f = h * 6 - i
		let p = v * (1 - s)
		let q = v * (1 - f * s)
		let t = v * (1 - (1 - f) * s)
		switch (i % 6) {
			case 0: r = v, g = t, b = p; break
			case 1: r = q, g = v, b = p; break
			case 2: r = p, g = v, b = t; break
			case 3: r = p, g = q, b = v; break
			case 4: r = t, g = p, b = v; break
			case 5: r = v, g = p, b = q; break
		}
		return [r * 255, g * 255, b * 255]
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

	this.setTemplateHandle = (_templateHandle) => {
	    templateHandle = _templateHandle
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

}