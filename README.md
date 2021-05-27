# PlotCritic
PlotCritic is a user-friendly and easily deployed tool for image scoring based on user-defined questions and answers.

## Installation
PlotCritic is available from Conda:

`conda install -c bioconda plotcritic`

## Website creation

### Basic use

Run the following command (substituting your own fields):
```
plotcritic \
  -p tmp \
  -i imgs/ \
  -q "What is love?" \
  -A "b":"Baby don't hurt me" "d":"Don't hurt me" "n":"No more" \
```

The arguments used above are:
`-p` A project name (must be unique). Required.

`-i` A directory of images (may also contain .json metadata files). Required.

`-q` A curation question to display in the website for scoring images. A default option exists, but it is expected that you will set this option for most projects.

`-A` The curation answers to display in the website for scoring images (must follow the example above, with a one-letter code and an answer for each entry, separated with commas and separated from other entries with spaces). Again, a default exists but likely will not perfectly fit your needs.

### Other arguments

`-s` PlotCritic is designed to work well with [Samplot](https://github.com/ryanlayer/samplot)-generated images, which can include extra metadata in .json files. to take advantage of this, PlotCritic has the additional option to add Samplot-oriented reporting and summary fields with the `-s` argument.

`-R` Allows user to customize the fields included in reporting. These fields must also be included in a .json metadata file matched by name to the image file.

`-S` Allows user to customize the fields included in summary report. If this is set, `-R` must be as well and these fields must be a subset of the `-R` fields.

### PlotCritic full help 

`plotcritic -h`

<details>
  <summary>Expand</summary>

```
PLOTCRITIC v1.0.0
usage: plotcritic [-h] -p PROJECT -i IMAGES_DIR [-s] [-q CURATION_QUESTION]
                  [-A CURATION_ANSWERS [CURATION_ANSWERS ...]]
                  [-R REPORT_FIELDS [REPORT_FIELDS ...]]
                  [-S SUMMARY_FIELDS [SUMMARY_FIELDS ...]]

Deploy a website for image curation

optional arguments:
  -h, --help            show this help message and exit
  -p PROJECT, --project PROJECT
                        Unique name for the project (default: None)
  -i IMAGES_DIR, --images_dir IMAGES_DIR
                        directory of images and metadata files for curation
                        (default: None)
  -s, --use_samplot_defaults
                        Use samplot-oriented default reporting_fields and
                        summary_fields. Ignores `--summary_fields` and
                        `--reporting_fields`. Default reporting fields: Image,
                        chrom, start, end, sv_type, reference, bams, titles,
                        output_file, transcript_file, window, max_depth
                        Default summary fields: Image, chrom, start, end,
                        sv_type (default: False)
  -q CURATION_QUESTION, --curation_question CURATION_QUESTION
                        The curation question to show in the PlotCritic
                        website. Samplot-oriented default. (default: Does the
                        top sample support the variant type shown? If so, does
                        it appear to be a de novo mutation? Choose one answer
                        from below or type the corresponding letter key.)
  -A CURATION_ANSWERS [CURATION_ANSWERS ...], --curation_answers CURATION_ANSWERS [CURATION_ANSWERS ...]
                        colon-separated key,values pairs of 1-letter codes and
                        associated curation answers for the curation question
                        (i.e: 'key1','value1' 'key2','value2'). Default (based
                        on default question): "s":"Supports" "n":"Does not
                        support" "d":"De novo" (default: None)
  -R REPORT_FIELDS [REPORT_FIELDS ...], --report_fields REPORT_FIELDS [REPORT_FIELDS ...]
                        space-separated list of info fields about the image.
                        If omitted, only the image name will be included in
                        report (default: None)
  -S SUMMARY_FIELDS [SUMMARY_FIELDS ...], --summary_fields SUMMARY_FIELDS [SUMMARY_FIELDS ...]
                        subset of the report fields that will be shown in the
                        web report after scoring.Space-separated. If omitted,
                        only the image name will be included in report
                        (default: None)
```
</details>


## Score images

The above command will create a local html website in a directory with the name of the project. Open the index.html file in that directory with your browser of choice to score images. Navigate to `Score Images` and set a username to begin.

<center>
  <kbd>
    <img src="/doc/imgs/scoring.png" style="border:solid"/>
  </kbd>
</center>

Click the answer buttons or press indicated keys to respond to the curation question for each image. When finished, download a report. Do not refresh or close the page before downloading report or scoring will be lost.

## Generate and view report
Navigate to `View Report` and upload any number of scoring report files to generate a report.

<center>
  <kbd>
    <img src="/doc/imgs/reporting.png" style="border:solid"/>
  </kbd>
</center>

#### Important points:

* Upload only files from the same project. 
* When new files are uploaded the existing report is wiped and restarted, so upload all files you want to integrate together.

The summary report is the same as the web report (one record per image), while the complete report contains each score (one record per user per image).

## Curate with a team
One major goal of PlotCritic is easy scaling to many curators. Version 1+ of PlotCritic simplifies this, with two main methods of sharing.

**Method 1:** A project leader creates a website as a directory via the `plotcritic` command and shares the directory with other users (via email, for example, as a compressed file, or direct transfer by USB drive). Users open the website locally and score images as described above, then return the downloaded scoring report to the project leader for report generation. This method maintains full security, no data is ever placed in public internet locations or available outside the team.

**Method 2:** A project leader creates a website as a directory via the `plotcritic` command and uploads the directory to a hosted server, giving the server URL to users. Users open the website locally and score images as described above, then return the downloaded scoring report to the project leader for report generation. This method is less secure, but may be appropriate and convenient for some projects with lower data security protocols.
