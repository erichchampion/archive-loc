This repo uses puppeteer to archive collections from the Library of Congress. 

To set things up, you should have node and npm or yarn installed on your system. Run one of the following commands to pull down the necessary libraries. 

yarn init
-or-
npm init

To find material to download, browse the digital collections at the Library of Congress. 

https://www.loc.gov/pictures/

Once you find a collection that you're interested in, for example, WPA Posters, make a note of the collection name at the end of the URL:

https://www.loc.gov/pictures/collection/wpapos/

In this case, it's wpapos. 

To pull down the items in the collection, run:

node index.js <collection>

In this case, the command would be:

node index.js wpapos

Because the Library of Congress website limits the bandwidth you can use, it will take a while for the script to run, but you'll be able to see the results in the working directory. 

The script will download each collection item to its own directory. Each directory will be named after the item id in its URL. In each directory, you'll find the jpg or tif images that were linked, along with the item data, saved in a txt file. 

Please feel free to contribute improvements. 