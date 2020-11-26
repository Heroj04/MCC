async function registerFont(path, options) {
	let font = new FontFace(options.family, `url(${path})`, options);
	let loadedFont = await font.load()
	document.fonts.add(loadedFont);
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
				default:
					break;
			}
			
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
							newStringFont = {}
							newStringFont["text"] = secondSplit[0]
							newStringFont["font"] = stringFont.font
							stringWithFontsNew.push(newStringFont)
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

	// Set the fill style
	context.fillStyle = layer.fillStyle

	// Set variables
	let x = 0
	let y = 0
	
	if (layer.wrapText || layer.scaleText) {
		throw new Error("Text wrapping and Autoscaling not yet supported")
	} else {
		let totalWidth = 0
		stringsWithFonts.forEach(stringFont => {
			context.font = stringFont.font
			totalWidth += context.measureText(stringFont.text).width
		});

		// Align Horizontally if needed
		context.textAlign = "start"
		switch (layer.align) {
			case "start":
				x = 0
				break;
			case "center":
				x = (layer.width / 2) - (totalWidth / 2)
				break;
			case "right":
				x = layer.width - totalWidth
				break;
			default:
				break;
		}

		// Align Vertically if needed
		context.textBaseline = layer.baseline
		switch (layer.baseline) {
			case "top":
				// do nothing start typing
				break;
			case "middle":
				y = (layer.height / 2)
				break;
			case "bottom":
				y = layer.height
				break;
			default:
				break;
		}
		
		// Draw the Text
		stringsWithFonts.forEach(stringFont => {
			context.font = stringFont.font
			context.fillText(stringFont.text, x, y)
			x += context.measureText(stringFont.text).width
		});
	}

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