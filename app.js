(function($){$(window).load(function(){


	/** GLOBALS **/
	var context = new AudioContext()
		, windowWidth = $(window).width()
		, windowHeight = $(window).height()
		, streamUrl = "http://futuradios.ice.infomaniak.ch/futuradios-48.aac"
		// , streamUrl = "http://listen.radionomy.com/radiomino"
		, drawingPrecision = 2
		, originalWidth = 1024
		, fillStyle = 'rgba(255,255,255,.4)'
		, analyser = context.createAnalyser()
		, canvasWidth = originalWidth * drawingPrecision
		, canvasHeight = windowHeight
		, canvas = $('#canvas')[0]
		, ctx = canvas.getContext('2d')
		, fullScale = 256
		, logWantedScale = 20
		, logOriginalScale = 10
		, logScale = logWantedScale / logOriginalScale
		, decades = 4
		, decadeWidth = canvasWidth / decades
		, audio = new Audio()
		, DYNRANGE = 6.02*8+1.76 // 8bit dyn.range ~= 50
		, dbreference = -3	// dB value of 0 VU
		, dbrange = 20-dbreference
		, tagsRoutineDelay = 10 * 1000
		, tagsRoutine
		, currentTitle
		, source
		, fbca
	;

	/** FONCTIONS **/
	var getArtistPicture = function(artist, cb) {
		artist = artist.split(' & ')[0];
		var url = 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(artist) + '&type=artist&limit=1';
		$.getJSON(url, function(data){
			var albumArt = data.artists.items[0].images[0];
			cb(albumArt);
		});
	};

	var getTitle = function(cb) {
		$.get('titre.php', cb);
	};

	var getArtist = function(cb) {
		$.get('artiste.php', cb);
	};

	var getTags = function() {
		getTitle(function(title) {
			if (title != currentTitle) {
				currentTitle = title;
				$('.tags .title').text(title);
				getArtist(function(artist) {
					$('.tags .artist').text(artist);
					albumArt = getArtistPicture(artist, function(albumArt) {
						$('.ball-inner').css('background-image', 'url(' + albumArt.url + ')');
					});
				});
			}
		});
	};

	var init = function() {
		audio.src = streamUrl;
		audio.controls = false;
		audio.loop = true;
		audio.autoplay = true;
		$('#audio').append(audio);
		source = context.createMediaElementSource(audio);

		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		source.connect(analyser);
		analyser.connect(context.destination);

		window.requestAnimationFrame(drawFFT);

		window.setTimeout(getTags, 0);
		tagsRoutine = window.setInterval(getTags, tagsRoutineDelay);
	};

	var scaleLog = function(x) {
		return Math.log10(x / logScale) * decadeWidth
	};

	var rmsPowerAnalysis = function() {
	    var length = analyser.frequencyBinCount;
		var wavedata = new Uint8Array(length);
		analyser.getByteTimeDomainData(wavedata);

	    var power = 0;
	    var numberOfChannels = 1; // fixme
	    for (var i = 0; i < length; i++) {
	    	var sample = wavedata[i]-128;
	    	power +=  sample * sample;
	    }
	    var rms = Math.sqrt(power / (numberOfChannels * length)) / DYNRANGE;
	    return decibel(rms);
	};

	var decibel = function(sampleValue) {
		return 20*Math.log10(sampleValue);
	};

	var updateBall = function() {
		var dbScale = Math.round(db2vu(rmsPowerAnalysis()) * 50);
		$('.ball-inner').css({
			boxShadow: '0 0 ' + dbScale + 'px ' + dbScale + 'px rgba(255,255,255,0.8)'
		});
		$('.bar').stop().animate({
			opacity: (dbScale * 2) / 100
		}, 50, 'linear').css({
			boxShadow: '0 0 ' + dbScale / 5 + 'px ' + dbScale / 5 + 'px rgba(255,255,255,0.8)'
		});
	};

	// returns 0..1
	var db2vu = function(decibel) {
		var normDB = (decibel+dbreference)/dbrange;
		var scaled = Math.PI/2+Math.PI/2*normDB;
		var normalized = 1-Math.cos(scaled);
		return normalized;
	};

	var drawFFT = function() {
		window.requestAnimationFrame(drawFFT);
		fbca = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(fbca);

		window.setTimeout(updateBall, 0);

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		ctx.fillStyle = fillStyle;
		ctx.beginPath();

		ctx.moveTo(0, canvasHeight);
		_.each(fbca, function(v, k) {
			var x, y;
			x = (k == 0 ? 0 : scaleLog(k));
			y = canvasHeight - (v * canvasHeight / fullScale);
			ctx.lineTo(x, y);
		});
		ctx.lineTo(canvasWidth, canvasHeight);
		ctx.closePath();

		ctx.fill();
	};

	init();

});})(jQuery);
