import re
import os

from setuptools import find_packages, setup


with open("README.md", "r") as fh:
    long_description = fh.read()

with open("plotcritic/__init__.py", "r") as fd:
    version = re.search(
        r'^__version__\s*=\s*[\'"]([^\'"]*)[\'"]', fd.read(), re.MULTILINE
    ).group(1)

with open("requirements.txt", "r") as f:
    requires = f.read().splitlines()

setup(
    name="plotcritic",
    version=version,
    description="scalable html-based curation tool for data images",
    long_description=long_description,
    long_description_content_type='text/markdown',
    author="Jonathan Belyeu",
    author_email="jrbelyeu@gmail.com",
    url="https://github.com/jbelyeu/PlotCritic.git",
    packages=find_packages(exclude=["tests", "*.tests", "*.tests.*", "tests.*"]),
    package_data={"plotcritic": ["LICENSE", "README.md", "templates/*", "templates/*/*"]},
    install_requires=requires,
    license="MIT",
    zip_safe=False,
    entry_points={
        'console_scripts': [
            'plotcritic = plotcritic.__main__:main'
        ]
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
    ],
)
