//# Composites

$.composites = {

// https://gist.github.com/Elringus/d21c8b0f87616ede9014
// http://en.wikipedia.org/wiki/Blend_modes
// http://w3.org/TR/compositing
// http://www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/pdf_reference_archives/blend_modes.pdf
// http://habrahabr.ru/post/256439/
	// func gray(c): c.r * 0.299 + c.g * 0.587 + c.b * 0.114;

	// func darken(a, b): min(a, b);
	// func multiply(a, b): a * b;
	// func colorBurn(a, b): 255 - (255 - a) / b;
	// func linearBurn(a, b): a + b - 255;
	// func darkerColor(a, b): gray(a) < gray(b) ? a : b;
	// func lighten(a, b): max(a, b);
	// func screen(a, b): 255 - (255 - a) * (255 - b);
	// func colorDodge(a, b): a / (255 - b);
	// func linearDodge(a, b): a + b;
	// func lighterColor(a, b): gray(a) > gray(b) ? a : b;
	// func overlay(a, b): a > 127 ? 255 - 2 * (255 - a) * (255 - b) : 2 * a * b;
	// (127 = 255/2) -- make a parameter?
	// func softLight(a, b): (255 - a) * a * b + a * (255 - (255 - a) * (255 - b));
	// func hardLight(a, b): b > 127 ? 255 - (255 - a) * (255 - 2 * (b - 127)) : a * (510 - b);
	// func vividLight(a, b): b > 127 ? a / (255 - (b - 127) * 510) : 255 - (255 - a) / (b * 2);
	// func linearLight(a, b): b > 127 ? a + 2 * (b - 127) : a + 2 * b - 255;
	// func pinLight(a, b): b > 127 ? max(a, 2 * (b - 127)) : min(a, 2 * b)
	// func hardMix(a, b): b > (127 - a) ? 255 : 0;
	// func difference(a, b): abs(a - b);
	// func exclusion(a, b): a + b - 2 * a * b; // (a-b)^2
	// func subtract(a, b): a - b;
	// func divide(a, b): a / b;
};