// 创建文本框
// @param subType 类型 => title1 标题; title2 副标题; content 正文内容
// @param fontFamily 字体（默认 null）
// @param fontColor 文字颜色（默认 null）
function createTextBox(subType, fontFamily, fontColor) {
    const fontSize = (subType == 'title1' ? 70 : (subType == 'title2' ? 35 : 18))
    const text = (subType == 'title1' || subType == 'title2' ? '输入标题' : '请输入内容')
    const textWordWrap = (subType == 'title1' || subType == 'title2' ? false : true)
    const textAlign = (subType == 'title1' || subType == 'title2' ? 'CENTER' : 'LEFT')
    const width = (text.length + 1) * fontSize
    const anchor = [(960 - width) / 2, 540 / 2 - fontSize, width, fontSize]
    if (textAlign == 'CENTER') {
        anchor[0] = (960 - width) / 2
    } else {
        anchor[0] = 960 / 2 - width
    }
    const id = 'txt' + Math.floor((Math.random() * 100000) + 100000)
    if (!fontColor && subType == 'title1') {
        // 标题默认颜色
        fontColor = {
          'type': 'gradient',
          'gradient': {
              'angle': 90,
              'colors': [
                {'color': -7614, 'realColor': -7614, 'alpha': 100000},
                {'color': -1838, 'realColor': -1838, 'alpha': 100000},
                {'color': -7614, 'realColor': -7614, 'alpha': 100000},
                {'color': -25569, 'realColor': -25569, 'alpha': 100000},
                {'color': -7614, 'realColor': -7614, 'alpha': 100000}
              ],
              'fractions': [0.06, 0.26, 0.5, 0.71, 0.89],
              'gradientType': 'linear'
          }
        }
    } else if (!fontColor) {
        // 正文默认颜色
        fontColor = {
          'type': 'color',
          'color': {
              'scheme': null,
              'realColor': -16777216,
              'color': -16777216
          },
          'gradient': null
        }
    }
    return {
        'id': `${id}`,
        'type': 'text',
        'depth': 1,
        'xpath': '//shapes[0]/text',
        'point': [...anchor],
        'extInfo': {
            'property': {
                'realType': 'TextBox',
                'shapeType': 'rect',
                'anchor': [...anchor],
                'fillStyle': {
                    'type': 'noFill'
                },
                'geometry': {
                    'name': 'rect'
                },
                'textAutofit': 'SHAPE',
                'textDirection': 'HORIZONTAL',
                'textVerticalAlignment': 'TOP',
                'textWordWrap': textWordWrap,
                'textInsets': [3.6,7.2,3.6,7.2]
            }
        },
        'children': [
            {
                'id': `${id}_p`,
                'pid': `${id}`,
                'type': 'p',
                'depth': 2,
                'xpath': '//shapes[0]/text/p',
                'extInfo': {
                    'property': {
                        'textAlign': textAlign,
                        'leftMargin': 0
                    }
                },
                'children': [
                    {
                        'id': `${id}_p_r`,
                        'pid': `${id}_p`,
                        'type': 'r',
                        'text': text,
                        'depth': 3,
                        'xpath': '//shapes[0]/text/p/r',
                        'extInfo': {
                            'property': {
                                'fontSize': fontSize,
                                'bold': null,
                                'fontFamily': fontFamily,
                                'fontColor': {...fontColor},
                                'line': null,
                                'lang': 'zh-CN'
                            }
                        }
                    }
                ]
            }
        ]
    }
}

// 创建形状
// @param geometryName 形状名称 => geometryMap key
// @param fillStyle 填充
// @param strokeStylePaint 画笔填充
function createGeometry(geometryName, fillStyle, strokeStylePaint) {
    const width = 200
    const height = 200
    const anchor = [(960 - width) / 2, (540 - height) / 2, width, height]
    const id = 'txt' + Math.floor((Math.random() * 100000) + 100000)
    if (!fillStyle) {
        fillStyle = {
            'type': 'color',
            'color': {
                'scheme': null,
                'color': -10773547,
                'realColor': -10773547
            }
        }
    }
    if (!strokeStylePaint) {
        strokeStylePaint = {
            'type': 'color',
            'color': {
                'scheme': null,
                'color': -10773547,
                'realColor': -14532775,
                'shade': 15000
            }
        }
    }
    return {
        'id': `${id}`,
    	'type': 'text',
    	'depth': 1,
    	'xpath': '//shapes[1]/text',
    	'point': [...anchor],
    	'extInfo': {
    		'property': {
    			'realType': 'Auto',
    			'shapeType': geometryName,
    			'anchor': [...anchor],
    			'fillStyle': {...fillStyle},
    			'strokeStyle': {
    				'paint': {...strokeStylePaint},
    				'lineWidth': 1,
    				'lineCap': 'FLAT',
    				'lineDash': 'SOLID',
    				'lineCompound': 'SINGLE'
    			},
    			'geometry': {
    				'name': geometryName,
    				'data': null,
    				'avLst': null
    			},
    			'textAutofit': 'NORMAL',
    			'textDirection': 'HORIZONTAL',
    			'textVerticalAlignment': 'MIDDLE',
    			'textInsets': [3.6, 7.2, 3.6, 7.2]
    		}
    	},
    	'children': [
    		{
    			'id': `${id}_p`,
    			'pid': `${id}`,
    			'type': 'p',
    			'depth': 2,
    			'xpath': '//shapes[1]/text/p',
    			'extInfo': {
    				'property': {
    					'textAlign': 'CENTER',
    					'leftMargin': 0
    				}
    			},
                'children': []
    		}
    	]
    }
}

// 创建图片
// @param src 图片src (url/base64)
function createImage(src, width, height) {
    if (!width) {
        width = 200
    }
    if (!height) {
        height = 200
    }
    const extension = src.indexOf('.png') > -1 || src.indexOf('image/png') ? '.png' : '.jpg'
    const id = 'img' + Math.floor((Math.random() * 100000) + 100000)
    const anchor = [(960 - width) / 2, (540 - height) / 2, width, height]
    return {
    	'id': id,
    	'depth': 1,
    	'type': 'image',
    	'point': [...anchor],
    	'extInfo': {
    		'property': {
                'image': src,
    			'anchor': [...anchor],
    			'extension': extension,
    			'fileName': 'image' + extension,
    			'contentType': extension == '.png' ? 'image/png' : 'image/jpeg',
    			'flipHorizontal': false,
    			'flipVertical': false,
    			'realType': 'Picture',
    			'geometry': {
    				'name': 'rect'
    			}
    		}
    	},
    	'children': [],
    	'xpath': '//shapes[0]/image'
    }
}

// 创建表格
// @param rowColumnDataList 表格数据: [['第1行1列', '第1行2列', '第1行3列'], ['第2行1列', '第2行2列', '第2行3列'], ['第3行1列', '第3行2列', '第3行3列']]
// @param rowFillStyles 填充色（按行循环交替）
// @param borderColor 边框颜色
// @param fontColor 字体颜色
function createTable(rowColumnDataList, rowFillStyles, borderColor, fontColor) {
    const rowNum = rowColumnDataList.length
    const columnNum = rowColumnDataList[0].length
    const lineWidth = 1
    const fontSize = 16
    const textAlign = 'LEFT'
    const rowHeight = 65, colWidth = 80
    const width = rowHeight * rowNum + lineWidth * (rowNum + 1)
    const height = colWidth * columnNum + lineWidth * (columnNum + 1)
    const tableAnchor = [(960 - width) / 2, (540 - height) / 2, width, height]
    const id = 'tab' + Math.floor((Math.random() * 100000) + 100000)
    const rows = []
    if (!rowFillStyles) {
        rowFillStyles = [
            {
                'type': 'color',
                'color': {
                    'color': -7555288,
                    'realColor': -1378864,
                    'lumMod': 20000,
                    'lumOff': 80000
                }
            },
            {
            	'type': 'color',
            	'color': {
            		'color': -7555288,
            		'realColor': -2823519,
            		'lumMod': 40000,
            		'lumOff': 60000
            	}
            }
        ]
    }
    if (!fontColor) {
        fontColor = {
            'type': 'color',
            'color': {
                'color': -16777216,
                'realColor': -16777216,
                'alpha': 100000
            }
        }
    }
    if (borderColor == null) {
        borderColor = -7555288
    }
    for (let i = 0; i < rowNum; i++) {
        const columns = []
        const fillStyle = rowFillStyles[i % rowFillStyles.length]
        for (let j = 0; j < columnNum; j++) {
            let text = rowColumnDataList[i][j]
            columns.push({
            	'id': `${id}_r${i}_c${j}`,
            	'pid': `${id}_r${i}`,
            	'type': 'tableColumn',
            	'depth': 3,
            	'xpath': `//shapes[0]/table/row[${i}]/column[${j}]`,
            	'extInfo': {
            		'property': {
            			'realType': 'TableCell',
            			'anchor': [tableAnchor[0] + colWidth * j + lineWidth * (j + 1), tableAnchor[1] + rowHeight * i + lineWidth * (i + 1), colWidth, rowHeight],
            			'fillStyle': {...fillStyle},
            			'strokeStyle': {},
            			'geometry': {
            				'name': 'tableColumn'
            			},
            			'textAutofit': 'NORMAL',
            			'textDirection': 'HORIZONTAL',
            			'textVerticalAlignment': 'MIDDLE',
            			'textInsets': [3.6, 7.2, 3.6, 7.2],
            			'columnWidth': colWidth,
            			'borders': [
            				{
            					'color': borderColor,
            					'lineWidth': lineWidth,
            					'lineCap': 'FLAT',
            					'lineDash': 'SOLID',
            					'lineCompound': 'SINGLE'
            				},
            				{
            					'color': borderColor,
            					'lineWidth': lineWidth,
            					'lineCap': 'FLAT',
            					'lineDash': 'SOLID',
            					'lineCompound': 'SINGLE'
            				},
            				{
            					'color': borderColor,
            					'lineWidth': lineWidth,
            					'lineCap': 'FLAT',
            					'lineDash': 'SOLID',
            					'lineCompound': 'SINGLE'
            				},
            				{
            					'color': borderColor,
            					'lineWidth': lineWidth,
            					'lineCap': 'FLAT',
            					'lineDash': 'SOLID',
            					'lineCompound': 'SINGLE'
            				}
            			]
            		}
            	},
            	'children': [
            		{
            			'id': `${id}_r${i}_c${j}_p`,
            			'pid': `${id}_r${i}_c${j}`,
            			'type': 'p',
            			'depth': 4,
            			'xpath': `//shapes[0]/table/row[${i}]/column[${j}]/p`,
            			'extInfo': {
            				'property': {
            					'textAlign': textAlign,
            					'leftMargin': 0
            				}
            			},
            			'children': [
            				{
            					'id': `${id}_r${i}_c${j}_p_r`,
            					'pid': `${id}_r${i}_c${j}_p`,
            					'type': 'r',
            					'text': text,
            					'depth': 5,
            					'xpath': `//shapes[0]/table/row[${i}]/column[${j}]/p/r`,
            					'extInfo': {
            						'property': {
            							'fontSize': fontSize,
            							'fontColor': {...fontColor},
            							'lang': 'zh-CN'
            						}
            					}
            				}
            			]
            		}
            	]
            })
        }
        rows.push({
        	'id': `${id}_r${i}`,
        	'pid': `${id}`,
        	'type': 'tableRow',
        	'depth': 2,
        	'xpath': `//shapes[0]/table/row[${i}]`,
        	'extInfo': {
        		'property': {
        			'rowHeight': rowHeight
        		}
        	},
        	'children': columns
        })
    }
    return {
    	'id': `${id}`,
    	'pid': null,
    	'type': 'table',
    	'text': null,
    	'depth': 1,
    	'xpath': '//shapes[0]/table',
    	'point': [...tableAnchor],
    	'extInfo': {
    		'property': {
    			'anchor': [...tableAnchor],
    			'realType': 'table',
                'numberOfRows': rowNum,
    			'numberOfColumns': columnNum
    		}
    	},
    	'children': rows
    }
}

// 创建图表
// @param title 图表标题
// @param chartType 图表类型 pie/doughnut/bar/line
// @param rowColumnDataList 表格数据:
// 柱状图、折线图: [[' ','系列 1','系列 2','系列 3'], ['类别 1','4.3','2.4','2'], ['类别 2','2.5','4.4','2'], ['类别 3','3.5','1.8','3'], ['类别 4','4.5','2.8','5']]
// 饼图、环形图: [[' ','销售额'], ['第一季度','8.2'], ['第二季度','3.2'], ['第三季度','1.4'], ['第四季度','1.2']]
// @param colors 颜色 [{type:'color',color:{realColor:-1213135}}]
function createChart(title, chartType, rowColumnDataList, colors) {
    if (!colors) {
        colors = [
            {'type': 'color', 'color': { 'color': -478429, 'realColor': -478429 }},
            {'type': 'color', 'color': { 'color': -10130855, 'realColor': -10130855 }},
            {'type': 'color', 'color': { 'color': -12143947, 'realColor': -12143947 }},
            {'type': 'color', 'color': { 'color': -7558530, 'realColor': -7558530 }},
            {'type': 'color', 'color': { 'color': -2920600, 'realColor': -2920600 }},
            {'type': 'color', 'color': { 'color': -8232330, 'realColor': -8232330 }}
        ]
    }
    if (chartType == 'pie' || chartType == 'doughnut') {
        rowColumnDataList[0][1] = rowColumnDataList[0][1] || title
        return createPieChart(rowColumnDataList, chartType == 'doughnut' ? 50 : 0, colors)
    } else if (chartType == 'bar' || chartType == 'line') {
        return createBarLineChart(title, chartType, rowColumnDataList, colors)
    }
    return null
}

function createPieChart(rowColumnDataList, holeSize, colors) {
    const width = 400
    const height = 220
    const anchor = [(960 - width) / 2, (540 - height) / 2, width, height]
    const id = 'chart' + Math.floor((Math.random() * 100000) + 100000)
    const dataPoint = []
    for (let i = 1; i < rowColumnDataList.length; i++) {
        dataPoint.push({
            'property': {
                'anchor': null,
                'fillStyle': colors[(i - 1) % colors.length],
                'strokeStyle': {
                    'paint': {
                        'type': 'color',
                        'color': {
                            'scheme': 'lt1',
                            'realColor': -1,
                            'color': -1
                        }
                    },
                    'lineWidth': 1.5
                },
                'geometry': null,
                'shadow': null
            }
        })
    }
    const chartData = {
    	'chartType': holeSize ? 'doughnut' : 'pie',
    	'series': [
    		{
    			'text': {
    				'formula': 'Sheet1!$B$1',
    				'formatCode': null,
    				'data': [rowColumnDataList[0][1]]
    			},
    			'category': {
    				'formula': 'Sheet1!$A$2:$A$' + rowColumnDataList.length,
    				'formatCode': null,
    				'data': rowColumnDataList.map(s => s[0]).splice(1)
    			},
    			'value': {
    				'formula': 'Sheet1!$B$2:$B$' + rowColumnDataList.length,
    				'formatCode': 'General',
    				'data': rowColumnDataList.map(s => s[1]).splice(1)
    			},
    			'dataPoint': dataPoint,
    			'property': null
    		}
    	],
    	'categoryAxis': null,
    	'valueAxes': null,
    	'extInfo': holeSize ? { 'holeSize': holeSize } : {}
    }
    return {
    	'id': id,
    	'type': 'graphicFrame',
    	'depth': 1,
    	'xpath': '//shapes[0]/graphicFrame',
    	'point': [...anchor],
    	'extInfo': {
    		'property': {
    			'anchor': [...anchor],
    			'chart': {
    				'title': '',
    				'legend': {
    					'position': 'BOTTOM',
    					'property': {
    						'anchor': null,
    						'fillStyle': {
    							'type': 'noFill'
    						},
    						'strokeStyle': {
    							'paint': {
    								'type': 'noFill'
    							}
    						},
    						'geometry': null,
    						'shadow': null
    					}
    				},
    				'excelData': [
    					{
    						'sheetName': 'Sheet1',
    						'rows': rowColumnDataList
    					}
    				],
    				'chartData': [chartData]
    			},
    			'realType': 'graphicFrame'
    		}
    	},
    	'children': []
    }
}

function createBarLineChart(title, chartType, rowColumnDataList, colors) {
    const width = 460
    const height = 270
    const anchor = [(960 - width) / 2, (540 - height) / 2, width, height]
    const id = 'chart' + Math.floor((Math.random() * 100000) + 100000)
    const series = []
    for (let i = 1; i < rowColumnDataList[0].length; i++) {
        const vf = String.fromCharCode(65 + i)
        series.push({
            'text': {
                'formula': 'Sheet1!$' + vf + '$1',
                'formatCode': null,
                'data': [rowColumnDataList[0][i]]
            },
            'category': {
                'formula': 'Sheet1!$A$' + (i + 1) + ':$A$' + rowColumnDataList.length,
                'formatCode': null,
                'data': rowColumnDataList.map(s => s[0]).splice(1)
            },
            'value': {
                'formula': 'Sheet1!$' + vf + '$' + (i + 1) + ':$' + vf + '$' + rowColumnDataList.length,
                'formatCode': 'General',
                'data': rowColumnDataList.map(s => s[i]).splice(1)
            },
            'dataPoint': [null],
            'property': {
                'anchor': null,
                'fillStyle': chartType == 'line' ? null : colors[(i - 1) % colors.length],
                'strokeStyle': chartType == 'line' ? {
                    'paint': colors[(i - 1) % colors.length],
                    'lineWidth': 2.25,
                    'lineCap': 'ROUND'
                } : {
                    'paint': {
                        'type': 'noFill'
                    }
                },
                'geometry': null,
                'shadow': null
            }
        })
    }
    let extInfo = {}
    if (chartType == 'bar') {
        extInfo = {
            'type': 'col',
            'overlap': '-27',
            'gapWidth': '219',
            'majorGridlines': 'true'
        }
    } else if (chartType == 'line') {
        extInfo = { 'majorGridlines': 'true' }
    }
    return {
    	'id': id,
    	'type': 'graphicFrame',
    	'depth': 1,
    	'xpath': '//shapes[0]/graphicFrame',
    	'point': [...anchor],
    	'extInfo': {
    		'property': {
    			'anchor': [...anchor],
    			'chart': {
    				'title': title,
    				'legend': {
    					'position': 'BOTTOM',
    					'property': {
    						'anchor': null,
    						'fillStyle': {
    							'type': 'noFill'
    						},
    						'strokeStyle': {
    							'paint': {
    								'type': 'noFill'
    							}
    						},
    						'geometry': null,
    						'shadow': null
    					}
    				},
    				'excelData': [
    					{
    						'sheetName': 'Sheet1',
    						'rows': rowColumnDataList
    					}
    				],
    				'chartData': [
    					{
    						'chartType': chartType,
    						'series': series,
    						'categoryAxis': {
    							'position': 'BOTTOM',
    							'deleted': false,
    							'property': {
    								'anchor': null,
    								'fillStyle': {
    									'type': 'noFill'
    								},
    								'strokeStyle': {
    									'paint': {
    										'type': 'color',
    										'color': {
    											'realColor': -2500135,
    											'color': -16777216,
    											'lumMod': 15000,
    											'lumOff': 85000
    										}
    									},
    									'lineWidth': 0.75,
    									'lineCap': 'FLAT',
    									'lineCompound': 'SINGLE'
    								},
    								'geometry': null,
    								'shadow': null
    							}
    						},
    						'valueAxes': [
    							{
    								'position': 'LEFT',
    								'deleted': false,
    								'property': {
    									'anchor': null,
    									'fillStyle': {
    										'type': 'noFill'
    									},
    									'strokeStyle': {
    										'paint': {
    											'type': 'noFill'
    										}
    									},
    									'geometry': null,
    									'shadow': null
    								}
    							}
    						],
    						'extInfo': extInfo
    					}
    				]
    			},
    			'realType': 'graphicFrame'
    		}
    	},
    	'children': []
    }
}