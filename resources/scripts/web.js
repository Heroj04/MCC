const defaultTemplates = [
	"templates/basicFullArtLand/basicFullArtLand.json"
]

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

async function loadTemplateToPage(templateURL) {
	loadTemplate(templateURL).then(template => {
		document.getElementById("json").value = JSON.stringify(template)
		inputUpdate()
	}).catch(e => {
		console.error(e)
	})
}

function injectTemplateCards() {
	defaultTemplates.forEach(templateURL => {
		loadTemplate(templateURL).then(template => {
			// Create Div Soup Here
			let cardDiv = document.createElement("DIV")
			cardDiv.setAttribute("class", "card")

			// All the card guts
			cardDiv.innerHTML = `\
			<img class="card-img-top w-75 mx-auto mt-4" src="${template.previewImage}" alt="${template.name} Preview">\
			<div class="card-body">\
				<h5 class="card-title">${template.name}</h5>\
				<p class="card-text">${template.author}</p>\
			</div>\
			<div class="card-footer">\
				<button type="button" class="btn btn-primary" style="width: 100%;" onClick="loadTemplateToPage('${templateURL}')">\
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmark-plus" viewBox="0 0 16 16">\
						<path fill-rule="evenodd" d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z"/>\
						<path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>\
					</svg>\
					Load Template\
				</button>\
			</div>\
			`

			// Put the card into the deck
			document.getElementById("card-deck").appendChild(cardDiv)
		}).catch(e => {
			console.error(e)
		})
	});
}

window.onload = injectTemplateCards