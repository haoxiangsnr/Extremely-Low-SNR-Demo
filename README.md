## A robust speech enhancement approach based on deep adversarial learning for extremely low signal-to-noise condition

🚧Under Construction🚧

We provide a demo for paper. 

## Demo

Visit demo: https://haoxiangsnr.github.io/low_snr_demo/

## Training Dataset

To evaluate the proposed approach, the [TIMIT](https://catalog.ldc.upenn.edu/LDC93S1) and [NOISEX92](http://spib.linse.ufsc.br/noise.html) corpus are used in the experiment. The TIMIT corpus is used as the clean database and the NOISEX-92 corpus are used as interference, respectively. 

### Utterance

We randomly select 40 speakers from the TIMIT corpus and then use the first 8 sentences of each speaker as the training utterance.

### Noise

We employ babble, factoryfloor1, destroyerengine and destroyerops from NOISEX-92 corpus for training.

### SNR

We mix the 280 utterance with these noise at 0dB, -5dB, -10dB and -15dB
SNR to create the training dataset. Beside these noises, we use factoryfloor2 to evaluate generalization performance. We mix all five noises with the remaining 120 utterance at 0dB, -3dB, -5dB, -7dB, -10dB, -12dB and -15dB SNR to create the testing dataset, where -3dB, -7dB and -12dB are unseen SNR conditions.