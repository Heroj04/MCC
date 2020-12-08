async function registerFont(path, options) {
	let font = new FontFace(options.family, `url(${path})`, options);
	let loadedFont = await font.load()
	document.fonts.add(loadedFont);
}

async function loadTemplate(path) {
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest();

		// Resolve the request on load
		request.onload = () => {
			if (request.status == 200) {
				resolve(JSON.parse(request.responseText));
			} else {
				reject(new Error("Failed to load resource Error: " + request.status))
			}
		}

		// Handle a complete failure also
		request.onerror = () => {
			reject(new Error("Network Error"))
		}
		
		// Start the request
		request.open("GET", path, true);
		request.send();
	})
}

function loadImage(path) {
	return new Promise((resolve, reject) => {
		let img = new Image();
		img.addEventListener('load', e => resolve(img));
		img.addEventListener('error', () => {
			reject(new Error(`Failed to load image's URL: ${path}`));
		});
		img.setAttribute("crossOrigin", "anonymous")
		img.src = path;
	});
}

function createCanvas(width, height) {
	let canvas = document.createElement("canvas");
	canvas.width = width
	canvas.height = height
	return canvas
}

function generateInputs(inputArray, parentDiv) {
	// Flip the input Order
	inputArray.reverse()
	// get the current inputs
	let currentInputValues = getInputValues(inputArray)
	// Clear the Parent Div
	parentDiv.innerHTML = ""
	// Set the previous input size
	let previousHalfSize = false

	inputArray.forEach(input => {
		// Label Creation
		let labelDOM = document.createElement("LABEL");
		labelDOM.setAttribute("for", input.name)
		labelDOM.innerHTML = input.description
		let labelDiv = document.createElement("DIV")
		labelDiv.setAttribute("class", "col-md-2 col-form-label")
		labelDiv.appendChild(labelDOM)

		// Create the inputDOM
		let inputDOM
		switch (input.type) {
			case "text":
			case "checkbox":
				// Regular input elements that match their type
				inputDOM = document.createElement("INPUT")
				inputDOM.setAttribute("type", input.type)
				inputDOM.setAttribute("id", input.name)
				inputDOM.setAttribute("class", "form-control")
				break;
			case "combo":
				// Combo box is a little special as we need to add the options
				inputDOM = document.createElement("SELECT")
				inputDOM.setAttribute("id", input.name)
				inputDOM.setAttribute("class", "form-control")
				// Add all the options
				input.options.forEach(option => {
					let optionDOM = document.createElement("OPTION")
					optionDOM.setAttribute("value", option)
					optionDOM.innerHTML = option
					inputDOM.appendChild(optionDOM)
				});
				break;
			case "textarea":
				// Textareas are their own element because of course they're different
				inputDOM = document.createElement("TEXTAREA")
				inputDOM.setAttribute("id", input.name)
				inputDOM.setAttribute("class", "form-control")
				break;
			case "file":
				// File Inputs need custom classes and what files to accept
				inputDOM = document.createElement("INPUT")
				inputDOM.setAttribute("type", input.type)
				inputDOM.setAttribute("id", input.name)
				inputDOM.setAttribute("class", "form-control-file")
				inputDOM.setAttribute("accept", "image/*")
				break;
			default:
				throw new Error("Input type " + input.type + " not recognised")
		}

		// Set the default value or copy from last template
		let value = currentInputValues[input.name] != undefined ? currentInputValues[input.name] : input.default
		switch (input.type) {
			case "text":
			case "textarea":
			case "combo":
				// Set the value attribute
				inputDOM.value = value
				break;
			case "checkbox":
				// set the checked property
				inputDOM.checked = value
				break;
			default:
				// Inputs that dont support default values
				break;
		}
		
		// Create Help Text
		let helpDOM = document.createElement("SMALL")
		inputDOM.setAttribute("aria-describedby", `${input.name}HelpText`)
		helpDOM.setAttribute("id", `${input.name}HelpText`)
		helpDOM.setAttribute("class", "form-text text-muted")
		helpDOM.innerHTML = input.help ? input.help : ""

		// Create the inputDiv
		let inputDiv = document.createElement("DIV")
		let colSize = input.halfSize ? "col-md-4" : "col-md-10"
		inputDiv.setAttribute("class", colSize)
		inputDiv.appendChild(inputDOM)
		inputDiv.appendChild(helpDOM)

		// Put everything into a row
		let rowDiv = previousHalfSize && input.halfSize ? parentDiv.childNodes[0] : document.createElement("DIV")
		if (previousHalfSize && input.halfSize) {
			// Put input into the current half row
			rowDiv.insertBefore(inputDiv, rowDiv.childNodes[0])
			rowDiv.insertBefore(labelDiv, rowDiv.childNodes[0])
		} else {
			// Put the input into its own row and add that row to the parent
			parentDiv.insertBefore(rowDiv, parentDiv.childNodes[0])
			rowDiv.setAttribute("class", "form-group row")
			rowDiv.appendChild(labelDiv)
			rowDiv.appendChild(inputDiv)
		}
		
		// Set the Current Half Size value
		previousHalfSize = input.halfSize
	});
}

function getInputValues(inputs) {
	let output = {}
	inputs.forEach(input => {
		try {
			let inputDOM = document.getElementById(input.name)
			if (inputDOM) {
				switch (input.type) {
					case "text":
					case "combo":
					case "textarea":
						// Just get the value property - Nice and easy
						output[input.name] = inputDOM.value
						break;
					case "checkbox":
						// Checkboxes have just got to be different
						output[input.name] = inputDOM.checked
						break;
					case "file":
						// Take the file and make an object URL
						output[input.name] = window.URL.createObjectURL(inputDOM.files[0])
					default:
						break;
				}
			}
		} catch (error) {
			console.log("Failed to get value of input: " + input.name)
		}
	});
	return output
}

async function drawLayer(layer, context) {
	switch (layer.type) {
		case "text":
			// Scale Text to size
			let scaledText = await scaleTextLayer(layer)
			// Draw the text to the canvas
			context.drawImage(scaledText, layer.originX, layer.originY, layer.width, layer.height)
			break;
		case "image":
			// Scale Image to size
			let scaledImage = await scaleImageLayer(layer)
			// Draw the scaled image to the canvas
			context.drawImage(scaledImage, layer.originX, layer.originY, layer.width, layer.height)
			break;
		default:
			break;
	}
}

async function generateCard(template, inputs) {
	// 69.6mm x 95.0mm (63mm x 88mm with bleed)
	// 300 dpi
	// const canvas = createCanvas(822, 1122)
	// 600 dpi
	// const canvas = createCanvas(1644, 2244)
	// 1200 dpi
	// let canvas = createCanvas(3288, 4288)

	// Load Custom Fonts
	template.customFonts.forEach(async font => {
		await registerFont(font.url, font)
	});

	// Set up the Canvas
	let canvas = createCanvas(template.width, template.height)
	let context = canvas.getContext("2d")

	// Fill the base Layer
	//context.fillStyle = template.base
	//context.fillRect(0, 0, template.width, template.height)

	// Invert the Layer Order
	template.layers.reverse()

	// Draw the layers
	for (let index = 0; index < template.layers.length; index++) {
		let layer = template.layers[index];
		if (processConditions(layer.conditions, inputs)) {
			// Update layer properties from inputs
			for (const layerProperty in layer.inputs) {
				if (layer.inputs.hasOwnProperty(layerProperty)) {
					const inputName = layer.inputs[layerProperty];
					if (inputs[inputName]) {
						layer[layerProperty] = inputs[inputName]
					}
				}
			}
			// Draw the layer
			try {
				await drawLayer(layer, context)
			} catch (error) {
				console.log("Failed to draw layer " + layer.description + ": " + error.message)
			}
		} else {
			console.log("Conditions for layer " + layer.description + " not met");
		}
	}

	// Return the completed Canvas
	return canvas
}

// Function that takes an image layer and returns a the image cropped and scaled as a canvas
async function scaleImageLayer(layer) {
	if (layer.type != "image") {
		throw new Error("Tried to scale a non image layer")
	} else if (layer.url == "") {
		throw new Error("Layer has no URL")
	}

	// Create a new canvas to return layer
	let canvas = createCanvas(layer.width, layer.height)
	let context = canvas.getContext("2d")

	// Get the image
	let image
	try {
		image = await loadImage(layer.url)
	} catch (error) {
		throw error
	}

	let x = 0
	let y = 0 
	let ratio = 1
	let newWidth = 0
	let newHeight = 0

	switch (layer.scale) {
		case "fill":
			// Fill the layer bounds with image (image may go outside of bounds and be cropped)
			// Scale the image to match width
			ratio = image.width / image.height;
			newWidth = layer.width;
			newHeight = newWidth / ratio;
			x = 0
			y = (newHeight - layer.height) / -2
			if (newHeight < layer.height) {
				// If height is not enough, scale to match
				newHeight = layer.height;
				newWidth = newHeight * ratio;
				x = (newWidth - layer.width) / -2
				y = 0
			}
			break;
		case "fit":
			// Fit the image to layer bounds (Image may have whitespace on edge)
			// Scale image to match width
			ratio = image.width / image.height;
			newWidth = layer.width;
			newHeight = newWidth / ratio;
			x = 0
			y = (newHeight - layer.height) / 2
			if (newHeight > layer.height) {
				// If height is too much, scale to match
				newHeight = layer.height;
				newWidth = newHeight * ratio;
				x = (newWidth - layer.width) / 2
				y = 0
			}
			break;
		case "stretch":
			// Stretch the image to match the layer bounds (Image may be distorted)
			// Just straight up set the width and height to match
			newWidth = layer.width;
			newHeight = layer.height;
			break;
		default:
			break;
	}

	// Write the image to the canvas (crops the image)
	context.drawImage(image, x, y, newWidth, newHeight)

	return canvas
}

// Function that takes a text layer and returns a the text scaled, wrapped as the correct font as a canvas
function scaleTextLayer(layer) {
	// Make sure we've actually got a text layer
	if (layer.type != "text") {
		throw new Error("Tried to scale a non image layer")
	}

	// Create the canvas that will be returned
	let canvas = createCanvas(layer.width, layer.height)
	let context = canvas.getContext("2d")

	// Set up the context
	context.textAlign = "start"
	context.textBaseline = "alphabetic"
	context.fillStyle = layer.fillStyle

	// Do any text replacements we need
	let text = layer.text
	for (const sourceString in layer.textReplace) {
		if (layer.textReplace.hasOwnProperty(sourceString)) {
			const replacementString = layer.textReplace[sourceString];
			text = text.replaceAll(sourceString, replacementString)
		}
	}

	// Build an array of fonts & Strings
	// This was the most confusing shit ever to work through
	let stringsWithFonts = []
	let temp = {}
	temp["text"] = text
	temp["font"] = layer.font
	stringsWithFonts.push(temp)
	for (const seperatorString in layer.fontReplace) {
		if (layer.fontReplace.hasOwnProperty(seperatorString)) {
			const font = layer.fontReplace[seperatorString];
			// Seperator Boundaries
			let stringWithFontsNew = []
			let seperatorStart = seperatorString.substring(0, seperatorString.length / 2) //First half of string
			let seperatorEnd = seperatorString.substring(seperatorString.length / 2) //Second half of string

			stringsWithFonts.forEach(stringFont => {
				let firstSplit = stringFont.text.split(seperatorStart)
				if (firstSplit.length > 1) {
					// The Seperator was found
					firstSplit.forEach(toBeClosed => {
						let secondSplit = toBeClosed.split(seperatorEnd)
						let newStringFont = {}
						if (secondSplit.length == 1) {
							if (secondSplit[0] != "") {
								// Only put the string in if it's not empty
								newStringFont = {}
								newStringFont["text"] = secondSplit[0]
								newStringFont["font"] = stringFont.font
								stringWithFontsNew.push(newStringFont)
							}
						} else if (secondSplit.length == 2) {
							newStringFont = {}
							newStringFont["text"] = secondSplit[0]
							newStringFont["font"] = font
							stringWithFontsNew.push(newStringFont)
							if (secondSplit[1] != "") {
								newStringFont = {}
								newStringFont["text"] = secondSplit[1]
								newStringFont["font"] = stringFont.font
								stringWithFontsNew.push(newStringFont)
							}
						} else {
							// This shouldn't really happen - more than one seperator end found
							let finalString = secondSplit.pop
							let firstString = secondSplit.join("")
							newStringFont = {}
							newStringFont["text"] = firstString
							newStringFont["font"] = stringFont.font
							stringWithFontsNew.push(newStringFont)
							if (finalString != "") {
								newStringFont = {}
								newStringFont["text"] = finalString
								newStringFont["font"] = font
								stringWithFontsNew.push(newStringFont)
							}
						}
					});
				} else {
					// No seperator found
					stringWithFontsNew.push(stringFont)
				}
			});
			stringsWithFonts = stringWithFontsNew
		}
	}

	let lineBreaks = [{
		"height": 0,
		"baselineHeight": 0,
		"width": 0,
		"stringFonts": []
	}]

	stringsWithFonts.forEach(stringFont => {
		// Split at line breaks
		let lines = stringFont.text.split("\n")
		// Put the split stringFonts into the lineBreaks array
		// The first one should always be on the current line
		newStringFont = {}
		newStringFont["text"] = lines[0]
		newStringFont["font"] = stringFont.font
		lineBreaks[lineBreaks.length - 1].stringFonts.push(newStringFont)
		// Calculate line metrics
		context.font = newStringFont.font
		let metrics = context.measureText(newStringFont.text)
		let height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
		lineBreaks[lineBreaks.length - 1].height = height > lineBreaks[lineBreaks.length - 1].height ? height : lineBreaks[lineBreaks.length - 1].height
		lineBreaks[lineBreaks.length - 1].baselineHeight = metrics.fontBoundingBoxAscent > lineBreaks[lineBreaks.length - 1].baselineHeight ? metrics.fontBoundingBoxAscent : lineBreaks[lineBreaks.length - 1].baselineHeight
		lineBreaks[lineBreaks.length - 1].width += metrics.width
		// everything else goes onto a new line
		if (lines.length > 1) {
			lineBreaks.push({
				"height": 0,
				"baselineHeight": 0,
				"width": 0,
				"stringFonts": []
			})
			// Regular for loop so we can start at 1
			for (let index = 1; index < lines.length; index++) {
				const line = lines[index];
				newStringFont = {}
				newStringFont["text"] = line
				newStringFont["font"] = stringFont.font
				lineBreaks[lineBreaks.length - 1].stringFonts.push(newStringFont)
				// Calculate line metrics
				context.font = newStringFont.font
				let metrics = context.measureText(newStringFont.text)
				let height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
				lineBreaks[lineBreaks.length - 1].height = height > lineBreaks[lineBreaks.length - 1].height ? height : lineBreaks[lineBreaks.length - 1].height
				lineBreaks[lineBreaks.length - 1].baselineHeight = metrics.fontBoundingBoxAscent > lineBreaks[lineBreaks.length - 1].baselineHeight ? metrics.fontBoundingBoxAscent : lineBreaks[lineBreaks.length - 1].baselineHeight
				lineBreaks[lineBreaks.length - 1].width += metrics.width
			}
		}
	})

	let totalHeight = 0
	let totalWidth = 0
	let scale = 1
	let finalLines

	// Always run at least once
	do {
		// Clone the linebreaks array so we have a fresh array each loop
		// I know this is a really dumb way of doing it but I really want an entirely new object with no references
		finalLines = JSON.parse(JSON.stringify(lineBreaks))

		// Word Wrapping
		if (layer.wrapText) {
			// Split each lines stringFonts into words as stringFonts
			finalLines.forEach((line, index) => {
				let splitLine = []
				line.stringFonts.forEach(stringFont => {
					let words = stringFont.text.split(" ")
					words.forEach(wordString => {
						newStringFont = {}
						newStringFont["text"] = wordString
						newStringFont["font"] = stringFont.font
						splitLine.push(newStringFont)
					});
				})
				finalLines[index].stringFonts = splitLine
			});

			// Check each line and where longer than a line, wrap to a new line
			// Regular for loop used here so we can edit the array and then process the new values
			for (let index = 0; index < finalLines.length; index++) {
				const line = finalLines[index];
				let currentLine = {
					"height":0,
					"baselineHeight": 0,
					"width": 0,
					"stringFonts": []
				}
				let lineWidth = 0
				// Regular for loop used here so we can break from it to stop processing words processed in next line
				for (let wordIndex = 0; wordIndex < line.stringFonts.length; wordIndex++) {
					const wordFont = line.stringFonts[wordIndex];
					// Make sure we measure with the space added back
					let spacedText = wordIndex == 0 ? wordFont.text : " " + wordFont.text
					// Measure the line with the word added in real units
					context.font = wordFont.font
					let metrics = context.measureText(spacedText)
					lineWidth += metrics.width * scale
					if (lineWidth > layer.width) {
						// We need to wrap current word and onwards to a new line
						let nextLine = {
							"height": 0,
							"baselineHeight": 0,
							"width": 0,
							"stringFonts": []
						}
						nextLine.stringFonts = line.stringFonts.slice(wordIndex)
						finalLines.splice(index + 1, 0, nextLine)
						// Replace the current line with the new current line with words that fit
						finalLines.splice(index, 1, currentLine)
						// Stop processing the current line
						break
					} else {
						// Put the word into the current Line
						newStringFont = {}
						newStringFont["text"] = spacedText
						newStringFont["font"] = wordFont.font
						currentLine.stringFonts.push(newStringFont)

						// Get the current Line metrics in real units
						let newHeight = (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * scale
						let newBaselineHeight = metrics.fontBoundingBoxAscent * scale
						// Save the current line metrics
						currentLine.height = newHeight > currentLine.height ? newHeight : currentLine.height
						currentLine.baselineHeight = newBaselineHeight > currentLine.baselineHeight ? newBaselineHeight : currentLine.baselineHeight
						currentLine.width = lineWidth
					}
				}
				// Replace the current line with the new current line with words that fit
				finalLines.splice(index, 1, currentLine)
			}
		}

		// Get the total height so we know where to start our cursor
		totalHeight = 0
		if (finalLines.length <= 1) {
			finalLines[0].height = layer.wrapText ? finalLines[0].height : finalLines[0].height * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
			finalLines[0].baselineHeight = layer.wrapText ? finalLines[0].baselineHeight : finalLines[0].baselineHeight * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
			totalHeight = finalLines[0].height
		} else {
			finalLines.forEach(line => {
				finalLines[0].height = layer.wrapText ? finalLines[0].height : finalLines[0].height * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
				finalLines[0].baselineHeight = layer.wrapText ? finalLines[0].baselineHeight : finalLines[0].baselineHeight * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
				totalHeight += line.height * layer.lineSpacing
			});
		}

		// Get the total Width so we can scale horizontal text
		totalWidth = 0
		finalLines.forEach(line => {
			line.width = layer.wrapText ? line.width : line.width * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
			totalWidth = line.width > totalWidth ? line.width : totalWidth
		});

		if (layer.scaleText && (totalHeight > layer.height || totalWidth > layer.width)) {
			// If we're going to loop, scale the context
			context.scale(0.95, 0.95)
			scale = scale * 0.95
		}
	} while (layer.scaleText && (totalHeight > layer.height || totalWidth > layer.width));

	// Set Cursor to origin
	let x = 0
	let y = 0

	// Align Vertically / Set Baseline
	switch (layer.baseline) {
		case "top":
			// Do nothing, we're already at x = 0
			break;
		case "middle":
			// move to the middle of the layer then up to the start of the text
			y = (layer.height / 2) - (totalHeight / 2)
			break;
		case "bottom":
			// move to the bottom of the layer then up to the start of the text
			y = layer.height - totalHeight
			break;
		default:
			break;
	}

	// Draw each line
	finalLines.forEach(line => {
		// Align Horizontally if needed
		switch (layer.align) {
			case "start":
				x = 0
				break;
			case "center":
				x = (layer.width / 2) - (line.width / 2)
				break;
			case "right":
				x = layer.width - line.width
				break;
			default:
				break;
		}

		// Move the cursor to the baseline of the current line
		y += line.baselineHeight

		// Draw each word of the line
		line.stringFonts.forEach((stringFont, index) => {
			context.font = stringFont.font
			// Divide by scale here so our real units turn into CSS units
			context.fillText(stringFont.text, x / scale, y / scale)
			x += context.measureText(stringFont.text).width * scale
		})

		// Move the cursor to the top of the next line
		y = y - line.baselineHeight + (line.height * layer.lineSpacing)
	});

	// Return the completed Canvas
	return canvas
}

function processConditions(conditions, inputs) {
	// If no conditions are specified default true
	if (conditions == undefined) {
		return true
	}

	// create an array of results
	let results = []

	for (const key in conditions) {
		if (conditions.hasOwnProperty(key)) {
			const element = conditions[key];
			
			if (key == "or") {
				// Process Or statement
				let anyTrue = false
				element.forEach(subConditions => {
					let output = processConditions(subConditions, inputs)
					if (output) {
						anyTrue = true
					}
				});
				results.push(anyTrue)
			} else {
				// Check if input equals check condition
				results.push(element == inputs[key])
			}
		}
	}

	// Check the results and return false if anything is false
	for (let index = 0; index < results.length; index++) {
		const result = results[index];
		if (!result) {
			return false
		}
	}
	// Nothing was false so return true
	return true
}