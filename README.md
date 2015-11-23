gtbg
====

A tool to help you prepare samples for use with the Elektron Machinedrum UW, Octatrack and Rytm. It works on Mac and PC and presumably Linux as well.

For accuracy, sample triming/padding is calculated at the sample level rather than milliseconds.

![gtbg](https://cloud.githubusercontent.com/assets/533348/11336522/42a469e6-91e6-11e5-9afd-017550cc745d.gif)

## Octatrack

Features for Octatrack users:
* Create sample chains from a folder of samples, normalised to OT slicing grids
* Normalise volume and convert to OT-friendly WAV files

The time length of each slice is by default (```sliceLength = 'auto'```) the length of the longest file. If you have a file with a lot of dead space at the end, this can inflate the size of your chain. Override it by setting ```sliceLength``` to a defined number of samples.

Eg, I see from Gtbg's output that a ride sample runs for 342,456 samples (7,770ms). Eyeballing the output chain file, it's clear that only half of that length is needed. I could then run:

```gtbg chainOt --sliceLength=171228```

Resuling in a trimmed-down chain file as each slice will be much shorter.

## Analog Rytm

Features for Rytm users:
* Like for Octatrack, create sample chains from a folder of samples, normalised to Rytm sample start and hold parameters
* Normalise volume and converts to monophonic, 16-bit 44.1kHz

## Machinedrum UW

Features for Machinedrum UW users:
* Add a relative amount of silence before samples so you can swing trigs with p-locked or LFO-controlled sample start parameter
* Converts samples to MD-friendly WAV files

## In general
Gtbg is a simple wrapper around [SoX](http://sox.sourceforge.net/), meaning audio processing is high quality, and you are able to do additional processing by specifing [SoX parameters](http://sox.sourceforge.net/sox.html). When scanning directories, Gtbg filters out files that don't have WAV, AIFF or MP3 extensions.

# Installing

## 1. Install Node.js

[Download](http://nodejs.org/) and run the installer for your platform  for your platform.

## 2. Install gtbg

In the terminal/command prompt, run:
```
npm -g install gtbg
```

This will make the command ```gtbg``` available globally on your computer.

## 3. Install SoX

### Mac
If you are on a Mac, I recommend installing [Homebrew](http://brew.sh/), a package manager to simplify installations. Once Homebrew is installed, you can install SoX with the simple command:

```
brew install sox
```

If you don't want to install it this way, please [download](http://sourceforge.net/projects/sox/files/sox/14.4.2/) and unzip SoX so it lives in your path.

### Windows
If you are on Windows, I recommend using [Chocolately](https://chocolatey.org/), a package manager to simplify installations. Once Chocolately is installed, you can install SoX with the simple command:

```
choco install sox
```

If you don't want to install it this way, please [download](http://sourceforge.net/projects/sox/files/sox/14.4.2/) and unzip SoX so it lives in your path.

# Quick start

To start off, you can run gtbg in _interactive_ mode, just by running 'gtbg'. You will be able to select from an available preset, choose your sample source directory and output directory.

# Usage examples

Gtbg has a base configuration file (config.json) which stores global settings. There is also a presets file (presets.json) with groups of settings which override the base configuration file. You can also specify options on the command line which override both preset and globals.

Output files are by default placed in the "output" folder in the same place you run gtbg.

Example: produce a sample chain made from all the samples in a specified directory (producing "909kit.wav" in the process):

```gtbg chainOt --samples "c:/samples/909kit/"```

Example: process individual samples to be Octatrack-friendly, outputting to a specified location:

```gtbg ot --samples "c:/samples/909kit/" --outputPath "c:/output/"```

Example: process individual samples to be Machinedrum-friendly

```gtbg md --samples "c:/samples/909kit/"```

Example: convert each subdirectory of 'samples' to be its own sample chain for the Rytm

```gtbg chainRytm --samples "c:/samples/"```

Example: process individual samples to be Octatrack-friendly, overriding some options and using SoX-supplied reverb and reverse effects

```gtbg ot --samples "c:/samples/909kit/"" --post="reverse reverb -w"```

Example: Dump information on samples without doing any processing

```gtbg info --samples "c:/samples/909kit/"```

Example: if you have a directory 'samples', and with sub-folders for different kits, you use process them in one batch:

```gtbg ot --samples "c:/samples/"```

# Options
Gtbg has a set of global options which apply for all operations, and individual options for the ```chainOt```, ```chainRytm```, ```ot``` and ```md`` commands.

## Global options

samples
* Path of your samples. Eg, "/Users/bazza/samples/" 
* Default: "./samples/", which presumes samples are in a folder named "samples" from where you run gtbg

overwrite
* Set to ```false``` to prevent output files being overwritten
* Default: true

showSoxOpts
* Set to ```true``` to see what options are passed to SoX
* Default: false

## Chain options

autoGain
* If ```true```, chain will be auto-gained to maximise volume without clipping.
* Default: true

sliceLength
* Can be set to 'auto', or a number, for the number of audio samples each slice within a chain should be. Auto length uses the longest sample as the length of slices.
* Default: 'auto'

sliceLengthMax
* If ```sliceLength = 'auto'```, this parameter, defined in audio samples, allows you to set an upper bound on the length of slices. Any file longer than the max will be truncated to fit.

appendSliceCount
* If ```true```, the count of slices in the chain is appended to its filename. This is handy so you know what sample start/end or slice settings you need on your machine.

## Individual options

sampleRate
* Sample rate of output files
* Default: 44100

prefix
* Relative amount of dead air to prefix sample by. A value of 1.0 (100%) would mean that the sample length is doubled, with dead air of the same length as the sample preceeding the sample. A value of 0.5 (50%) would mean that the sample is preceeded by dead air half as long as the sample. Relative amounts are used because the Machinedrum uses a fixed 1-127 sample start parameter which is relative to the sample length.

post
* Arbitrary [command line options to pass to SoX](http://sox.sourceforge.net/sox.html)

removeStereo
* If ```true``` sample is converted to mono
* Default: true for ```md``` command

bitDepth
* Bit depth of final output
* Default: 12 for MD, 16 for OT.
