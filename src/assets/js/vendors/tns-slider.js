// Tiny Slider js

// Note: Modal product slider is now powered by the custom auto-slider in modal-product.html


// Slider for product
if (document.querySelectorAll('.product').length > 1) {
	var productSlider = tns({
		container: '#product',
		items: 1,
		startIndex: 0,
		navContainer: '#productThumbnails',
		navAsThumbnails: true,
		autoplay: false,
		autoplayTimeout: 1500,
		swipeAngle: false,
		speed: 1500,
		controls: false,
		autoplayButtonOutput: false,
	});
}
