(function() {
    var c = 0, num, s = document.getElementsByClassName('prettyprint source');
    if (s && s[0]) {
        s = s[0].getElementsByTagName('code')[0];
        num = s.innerHTML.split('\n');
        num = num.map(function(item) {c++;return '<span id="line' + c + '" class="lineNum">'+c+'</span>' + item;});
        s.innerHTML = num.join('\n');
    }
}());