function submitForm(event) {
    event.preventDefault();
    var url = document.getElementById('url').value;
    document.getElementById("notification").innerHTML = "Now processing the playlist... ⏳ Don't worry this can take a while";
    fetch("/api/get_playlist_data?url=" + url)
        .then(response => response.json())
        .then(responseObject => {
            console.log(responseObject);
            if (responseObject.error != null) {
                document.getElementById("notification").innerHTML = "An error occured ❌ - " + responseObject.error;
            }
            else{
                document.getElementById("notification").innerHTML = "Successfully processed! ✅   ";
                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(responseObject));
                var downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "playlist.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                var downloadLink = document.createElement('a');
                downloadLink.setAttribute("href", dataStr);
                downloadLink.setAttribute("download", "playlist.json");
                downloadLink.innerHTML = "Download playlist";
                document.getElementById("notification").appendChild(downloadLink);


            }
        })
        .catch(error => {
            console.error(error);
        });
}