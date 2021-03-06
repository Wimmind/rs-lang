import React, { Component } from 'react';
import s from './game-page.module.css';
import WordList from '../word-list/word-list';
import Preloader from '../preloader/preloader';
import GameModel from '../game-model/game-model';
import error from '../assets/audio/error.mp3';
import correct from '../assets/audio/correct.mp3';

export default class GamePage extends Component {
  constructor(props) {
    super(props);
    this.level = this.props.level;
    this.userWords = null;
    this.correctAnswers = [];
    this.incorrectAnswers = [];
    this.currentSeries = 0;
    this.longestSeries = 0;
    this.state = {
      isQuestion: true,
      isCorrectAnswer: true,
      preloader: true,
      soundOn: true,
      bgColors: {r: 179, g: 213, b: 216},
      bgPercent: 40,
      degree: 0,
      colorH: 213,
      colorS: 100,
      colorL: 71,
    }
  }

  componentDidMount() {
    this.gameModel = new GameModel(this.level);
    this.gameModel.init().then((res) => {
      let [currentWord, answers] = res;
      this.setState({ currentWord, answers, preloader: false });
      this.playWord();
      this.userWords = this.gameModel.userWords;
    })

    document.addEventListener("keydown", this.keyboardEvents);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.keyboardEvents);
  }

  pass = () => {
    const { currentWord } = this.state;
    this.incorrectAnswers.push(currentWord);    
    this.currentSeries = 0;
    this.updateUserWordDifficulty(currentWord);
    this.playSound(error);
    this.setState({ isQuestion: false, isCorrectAnswer: false, answerId: undefined });
  }
  
  getAnswersSeries = () => {
    this.currentSeries += 1;
    
    if (this.currentSeries > this.longestSeries) {
      this.longestSeries = this.currentSeries;
    }
  }

  updateUserWord = async ({ wordId, word }) => {
    const {userId, token} = localStorage;

    const rawResponse = await fetch(`https://afternoon-falls-25894.herokuapp.com/users/${userId}/words/${wordId}`, {
        method: 'PUT',
        withCredentials: true,
        headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(word)

    });
    const content = await rawResponse.json();    
  };

  updateUserWordDifficulty = (currentWord) => {
    if (this.level !== '6') return;

    const difficultWord = this.userWords.find((item) => item.wordId === currentWord.id);
    const { wordId, optional: { word , repeat } } = difficultWord;

    this.updateUserWord({
      wordId,
      word: { "difficulty": "hard", "optional": {'word': word, 'currentDate': new Date().toISOString().split('T')[0], 'repeatDate': new Date().toISOString().split('T')[0], 'repeat' : repeat + 1}},
    });    
  }

  getAnswer = (event) => {    
    const { isQuestion, currentWord } = this.state;

    if (!isQuestion) return;

    const answer = event.target.dataset.correct;
    if (answer === 'true') {
      this.correctAnswers.push(currentWord);   
      this.getAnswersSeries();
      this.playSound(correct);  
    } else {
      this.incorrectAnswers.push(currentWord);  
      this.currentSeries = 0;
      this.playSound(error);  
      this.updateUserWordDifficulty(currentWord);
    }

    const id = event.target.id;

    this.setState({ isQuestion: false, isCorrectAnswer: answer, answerId: id });
  }

  getAnswerByKeyboard = (event) => {
    const { isQuestion, currentWord, answers } = this.state;

    if (!isQuestion) return;

    const answer = this.state.answers[+event.key - 1].correct.toString();

    if (answer === 'true') {
      this.correctAnswers.push(currentWord);   
      this.getAnswersSeries();
      this.playSound(correct);  
    } else {
      this.incorrectAnswers.push(currentWord);  
      this.currentSeries = 0;
      this.updateUserWordDifficulty(currentWord);
      this.playSound(error);  
    }

    const id = answers[+event.key - 1].id;

    this.setState({ isQuestion: false, isCorrectAnswer: answer, answerId: id });
  }

  nextWord = () => {
    this.setState({preloader: true})
    const newPageData = this.gameModel.nextTurn();
    if(!newPageData) {
      this.props.showStatistics(this.correctAnswers, this.incorrectAnswers, this.longestSeries);
      return;
    }

    newPageData.then(([currentWord, answers]) => {
      const {colorH, colorS, colorL } = this.state;
      this.setState({ 
        isQuestion: true, 
        currentWord, 
        answers, 
        preloader:false,
        colorH: colorH + 2,
        colorS: colorS - 3,
        colorL: colorL - 1,
        closeModal: false,
      });          
      this.playWord();  
    }); 
  }

  nextWordByKeyboard = (event) => {
    if (event.key === 'Enter') {
      this.nextWord();
    }
  }

  playWord = () => {
    const { audio } = this.state.currentWord;
    this.audio = new Audio(`https://raw.githubusercontent.com/yrevtovich/rslang-data/master/${audio}`);
    this.audio.play();
  }

  switchSound = () => {
    this.setState(({soundOn: !this.state.soundOn}))
  }

  playSound = (sound) => {   
    if (!this.state.soundOn) return;

    const audio = new Audio(sound);
    audio.play();
  } 

  keyboardEvents = (event) => {
    const key = event.key;

    switch (key) {
      case 'Enter':
        if (!this.state.isQuestion) {
          this.nextWord();
        } else {
          this.pass();
        }
        break;
      case '1':
        this.getAnswerByKeyboard(event);
        break;
      case '2':
        this.getAnswerByKeyboard(event);
        break; 
      case '3':
        this.getAnswerByKeyboard(event);
        break;
      case '4':
        this.getAnswerByKeyboard(event);
        break; 
      case '5':
        this.getAnswerByKeyboard(event);
        break;       
      default: 
        break;
    }
  }

  render() {
    const { preloader, colorH, colorS, colorL, closeModal } = this.state;

    const { closeGame } = this.props;
    
    if (!preloader) {
      const { isQuestion, answers, answerId, isCorrectAnswer, currentWord : { image, wordTranslate }, soundOn } = this.state;

      return (
        <div className = {s.page} style={{backgroundColor:`hsl(${colorH}, ${colorS}%, ${colorL}%)`}} >
          <button className={s.cancel} onClick={closeGame}/>
          <button className={soundOn ? s.sound : `${s.sound} ${s.soundOff}`} onClick={this.switchSound} />
          <div className={s.gameWrapper}> 
            <div className={s.questionBoard}>
              <img className={isQuestion ? s.hidden : s.wordImg} src={`https://raw.githubusercontent.com/yrevtovich/rslang-data/master/${image}`} alt='word illustration'/>
              
              <div className={s.wordData}>
                <button className={isQuestion ? `${s.wordSound} ${s.wordSoundQuestion}` : s.wordSound} onClick={this.playWord}/>
                <p className={isQuestion ? s.hidden : s.translation}>{wordTranslate}</p>
              </div>
            </div>
  
            <WordList words={answers} callback={this.getAnswer} isQuestion={isQuestion} answer={isCorrectAnswer} answerId={answerId} /> 
            
            <button className={isQuestion ? s.pass : s.hidden} onClick={this.pass}>Pass</button>
            <button className={isQuestion ? s.hidden : s.next} type='button' onClick={this.nextWord} >
              Next word
            </button>
          </div>        
        </div>
      )
    }

    return (
      <div className = {s.page} style={{backgroundColor:`hsl(${colorH}, 100%, 71%)`}}>
        <Preloader />
      </div>
    )
  }
  
  
}
