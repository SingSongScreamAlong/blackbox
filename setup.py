from setuptools import setup, find_packages

setup(
    name="project-blackbox",
    version="1.0.0",
    description="Universal Racing HUD System",
    author="Project Blackbox Team",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "Flask>=2.3.0",
    ],
    entry_points={
        'console_scripts': [
            'blackbox=minimal_app:main',
        ],
    },
)
