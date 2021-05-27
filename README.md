# PlotCritic
PlotCritic is a user-friendly and easily deployed tool for image scoring, supported by AWS backend resources for security and easy scaling.

## Installation
PlotCritic is available from Conda:
`conda install -c bioconda plotcritic`

## Website creation

Run the following command (substituting your own fields):
```
plotcritic -p tmp -i imgs/ -S "chrom" "start" "end" "sv_type" -q "What is love?" -A "b":"Baby don't hurt me" "n":"No more"```

The arguments used above are:
`-p` A project name (must be unique)

`-q` A curation question to display in the website for scoring images

`-A` The curation answers to display in the website for scoring images (must follow the example above, with a one-letter code and an answer for each entry, separated with commas and separated from other entries with spaces)

```

If the curation question and answers are not set, defaults are as follows:

```
Question:
"Does the top sample support the variant type shown? If so, does it appear to be a de novo mutation? Choose one answer from below or type the corresponding letter key."

Answers:
"s":"Supports" "n":"Does not support" "d","De novo"
```

## Score images

The above command will create a local html website in a directory with the name of the project. Open the index.html file in that directory with your browser of choice to score images.

_Under development: details of web interface coming soon_

## Generate Reports
_Under development: details of web interface coming soon_
