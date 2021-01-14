async function generate() {
	console.log("Generating Image")
	// Get the template and inputs
	let template = JSON.parse(document.getElementById("json").value)
	let inputs = getInputValues(template.inputs)

	// Generate the Image
	generateCard(template, inputs).then((canvas) => {
		let fullScaleImage = changeDpiDataUrl(canvas.toDataURL(), template.dpi)

		// Output the Image
		document.getElementById("Image").src = fullScaleImage
		let link = document.getElementById("download-link")
		link.setAttribute("href", fullScaleImage)
		link.removeAttribute("disabled")
		console.log("Image Created");
	})
}

async function inputUpdate() {
	console.log("Updating Input Fields")
	let template = JSON.parse(document.getElementById("json").value)
	generateInputs(template.inputs, document.getElementById("inputs"))
	document.getElementById("templateName").innerHTML = template.name
	document.getElementById("generate-image").removeAttribute("disabled")
	document.getElementById("download-link").setAttribute("download", template.name + ".png")
}